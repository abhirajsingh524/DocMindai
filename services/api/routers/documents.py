import os
import hashlib
import asyncio
import uuid
from pathlib import Path
from typing import List, Optional
from datetime import datetime, timezone
import aiofiles

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, BackgroundTasks, status
from pydantic import BaseModel
from sqlalchemy import select, delete, update
from sqlalchemy.ext.asyncio import AsyncSession

from services.api.config import settings
from services.api.database import get_db, AsyncSessionLocal
from services.api.models import Document, Chunk, Job, Workspace, User
from services.api.auth import get_current_user, get_current_workspace
from services.api.ingestion.extractor import extract_from_file
from services.api.ingestion.chunker import chunk_sections
from services.api.retrieval.vector_store import get_vector_store

router = APIRouter(prefix="/api/v1", tags=["Documents"])

class UploadIntentRequest(BaseModel):
    filename: str
    file_type: str
    file_size: int

class UploadIntentResponse(BaseModel):
    upload_id: str
    upload_url: str
    storage_key: str

class DocumentSummary(BaseModel):
    id: str
    workspace_id: str
    filename: str
    file_type: str
    file_size: int
    status: str
    version: int
    chunk_count: int
    extraction_warnings: Optional[str] = None
    created_at: str

async def process_document_pipeline(document_id: str, file_path: str, file_type: str, workspace_id: str):
    """
    Background worker pipeline for document processing:
    extracting -> chunking -> embedding -> indexing -> ready
    """
    async with AsyncSessionLocal() as db:
        # Load document
        res = await db.execute(select(Document).where(Document.id == document_id))
        doc = res.scalar_one_or_none()
        if not doc:
            return

        try:
            # Stage 1: extracting
            doc.status = "extracting"
            await db.commit()

            sections, warnings = extract_from_file(file_path, file_type)
            if warnings:
                doc.extraction_warnings = "; ".join(warnings)

            # Stage 2: chunking
            doc.status = "embedding"
            await db.commit()

            chunk_datas = chunk_sections(sections)
            if not chunk_datas:
                raise ValueError("No text could be extracted or chunked from document.")

            # Stage 3: write chunks
            # Remove previous chunks if retry
            await db.execute(delete(Chunk).where(Chunk.document_id == document_id))

            db_chunks = []
            for ch in chunk_datas:
                c = Chunk(
                    document_id=doc.id,
                    workspace_id=workspace_id,
                    version=doc.version,
                    chunk_index=ch.chunk_index,
                    text=ch.text,
                    page_number=ch.page_number,
                    section_title=ch.section_title,
                    token_count=ch.token_count
                )
                db.add(c)
                db_chunks.append(c)

            await db.commit()
            for c in db_chunks:
                await db.refresh(c)

            # Stage 4: indexing into FAISS vector store
            doc.status = "indexing"
            await db.commit()

            vstore = get_vector_store(workspace_id)
            await vstore.add_document_chunks(
                document_id=doc.id,
                document_name=doc.filename,
                document_version=doc.version,
                chunks=db_chunks
            )

            # Mark ready
            doc.status = "ready"
            doc.chunk_count = len(db_chunks)
            await db.commit()

        except Exception as e:
            doc.status = "failed"
            doc.extraction_warnings = f"Processing Error: {str(e)}"
            await db.commit()

@router.post("/uploads", response_model=UploadIntentResponse)
async def create_upload_intent(
    req: UploadIntentRequest,
    workspace: Workspace = Depends(get_current_workspace)
):
    if req.file_size > settings.MAX_FILE_SIZE_BYTES:
        raise HTTPException(
            status_code=400,
            detail=f"File exceeds maximum allowed size ({settings.MAX_FILE_SIZE_BYTES / (1024*1024)}MB)"
        )
    ext = req.filename.split(".")[-1].lower() if "." in req.filename else req.file_type.lower()
    if ext not in ["pdf", "docx", "txt", "md"]:
        raise HTTPException(status_code=400, detail="Only PDF, DOCX, and TXT/MD files are supported.")

    upload_id = str(uuid.uuid4())
    storage_key = f"{workspace.id}/{upload_id}_{req.filename}"
    upload_url = f"/api/v1/uploads/{upload_id}/file"
    return {
        "upload_id": upload_id,
        "upload_url": upload_url,
        "storage_key": storage_key
    }

@router.post("/documents/upload", status_code=status.HTTP_201_CREATED)
async def upload_document(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    workspace: Workspace = Depends(get_current_workspace),
    db: AsyncSession = Depends(get_db)
):
    filename = file.filename or "uploaded_document"
    ext = filename.split(".")[-1].lower() if "." in filename else "txt"
    if ext not in ["pdf", "docx", "txt", "md"]:
        raise HTTPException(status_code=400, detail=f"Unsupported file format '{ext}'. Must be PDF, DOCX, or TXT.")

    ws_storage = Path(settings.STORAGE_DIR) / workspace.id
    ws_storage.mkdir(parents=True, exist_ok=True)
    
    file_id = str(uuid.uuid4())
    saved_filename = f"{file_id}_{filename}"
    saved_path = ws_storage / saved_filename

    # Read and save bytes
    hasher = hashlib.sha256()
    size = 0
    async with aiofiles.open(saved_path, "wb") as out_file:
        while content := await file.read(1024 * 1024):  # 1MB chunks
            size += len(content)
            if size > settings.MAX_FILE_SIZE_BYTES:
                if saved_path.exists():
                    saved_path.unlink()
                raise HTTPException(status_code=400, detail="File exceeded size limit.")
            hasher.update(content)
            await out_file.write(content)

    file_hash = hasher.hexdigest()

    # Create document record
    doc = Document(
        workspace_id=workspace.id,
        filename=filename,
        file_type=ext,
        file_size=size,
        status="queued",
        version=1,
        storage_key=str(saved_path),
        file_hash=file_hash
    )
    db.add(doc)
    await db.commit()
    await db.refresh(doc)

    # Launch background processing
    background_tasks.add_task(
        process_document_pipeline,
        doc.id,
        str(saved_path),
        ext,
        workspace.id
    )

    return {
        "id": doc.id,
        "filename": doc.filename,
        "status": doc.status,
        "file_size": doc.file_size,
        "message": "Document accepted for ingestion"
    }

@router.get("/documents", response_model=List[DocumentSummary])
async def list_documents(
    query: Optional[str] = None,
    status_filter: Optional[str] = None,
    workspace: Workspace = Depends(get_current_workspace),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(Document).where(Document.workspace_id == workspace.id).order_by(Document.created_at.desc())
    if status_filter:
        stmt = stmt.where(Document.status == status_filter)
    if query:
        stmt = stmt.where(Document.filename.ilike(f"%{query}%"))
        
    res = await db.execute(stmt)
    docs = res.scalars().all()
    
    return [
        DocumentSummary(
            id=d.id,
            workspace_id=d.workspace_id,
            filename=d.filename,
            file_type=d.file_type,
            file_size=d.file_size,
            status=d.status,
            version=d.version,
            chunk_count=d.chunk_count,
            extraction_warnings=d.extraction_warnings,
            created_at=d.created_at.isoformat()
        )
        for d in docs
    ]

@router.get("/documents/{id}")
async def get_document(
    id: str,
    workspace: Workspace = Depends(get_current_workspace),
    db: AsyncSession = Depends(get_db)
):
    res = await db.execute(
        select(Document).where(Document.id == id, Document.workspace_id == workspace.id)
    )
    doc = res.scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    chunk_res = await db.execute(
        select(Chunk).where(Chunk.document_id == id).order_by(Chunk.chunk_index.asc())
    )
    chunks = chunk_res.scalars().all()

    return {
        "id": doc.id,
        "filename": doc.filename,
        "file_type": doc.file_type,
        "file_size": doc.file_size,
        "status": doc.status,
        "version": doc.version,
        "chunk_count": doc.chunk_count,
        "extraction_warnings": doc.extraction_warnings,
        "created_at": doc.created_at.isoformat(),
        "chunks": [
            {
                "id": c.id,
                "chunk_index": c.chunk_index,
                "page_number": c.page_number,
                "section_title": c.section_title,
                "token_count": c.token_count,
                "preview": c.text[:120] + "..." if len(c.text) > 120 else c.text
            }
            for c in chunks
        ]
    }

@router.get("/documents/{id}/content")
async def get_document_content(
    id: str,
    workspace: Workspace = Depends(get_current_workspace),
    db: AsyncSession = Depends(get_db)
):
    res = await db.execute(
        select(Document).where(Document.id == id, Document.workspace_id == workspace.id)
    )
    doc = res.scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    chunk_res = await db.execute(
        select(Chunk).where(Chunk.document_id == id).order_by(Chunk.chunk_index.asc())
    )
    chunks = chunk_res.scalars().all()
    full_text = "\n\n".join([f"[{c.section_title or f'Page {c.page_number}' or 'Section'}]\n{c.text}" for c in chunks])

    return {
        "id": doc.id,
        "filename": doc.filename,
        "file_type": doc.file_type,
        "content": full_text
    }

@router.post("/documents/{id}/retry")
async def retry_document(
    id: str,
    background_tasks: BackgroundTasks,
    workspace: Workspace = Depends(get_current_workspace),
    db: AsyncSession = Depends(get_db)
):
    res = await db.execute(
        select(Document).where(Document.id == id, Document.workspace_id == workspace.id)
    )
    doc = res.scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    doc.status = "queued"
    doc.extraction_warnings = None
    doc.version += 1
    await db.commit()

    background_tasks.add_task(
        process_document_pipeline,
        doc.id,
        doc.storage_key,
        doc.file_type,
        workspace.id
    )

    return {"status": "retrying", "document_id": doc.id, "version": doc.version}

@router.delete("/documents/{id}")
async def delete_document(
    id: str,
    workspace: Workspace = Depends(get_current_workspace),
    db: AsyncSession = Depends(get_db)
):
    res = await db.execute(
        select(Document).where(Document.id == id, Document.workspace_id == workspace.id)
    )
    doc = res.scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    storage_path = doc.storage_key

    # Immediately delete vectors from FAISS
    vstore = get_vector_store(workspace.id)
    await vstore.delete_document(doc.id)

    # Delete chunks and doc from DB
    await db.execute(delete(Chunk).where(Chunk.document_id == doc.id))
    await db.execute(delete(Document).where(Document.id == doc.id))
    await db.commit()

    # Clean local file
    try:
        p = Path(storage_path)
        if p.exists():
            p.unlink()
    except Exception:
        pass

    return {"status": "deleted", "document_id": id}
