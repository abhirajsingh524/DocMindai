from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from services.api.database import get_db
from services.api.models import Citation, Chunk, Document, Workspace
from services.api.auth import get_current_workspace

router = APIRouter(prefix="/api/v1/citations", tags=["Citations"])

@router.get("/{id}/source")
async def get_citation_source(
    id: str,
    workspace: Workspace = Depends(get_current_workspace),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(Citation).where(Citation.id == id)
    res = await db.execute(stmt)
    citation = res.scalar_one_or_none()
    if not citation:
        raise HTTPException(status_code=404, detail="Citation not found")

    # Verify document is authorized in this workspace
    doc_res = await db.execute(
        select(Document).where(Document.id == citation.document_id, Document.workspace_id == workspace.id)
    )
    doc = doc_res.scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=403, detail="Citation references a document not accessible in this workspace")

    return {
        "citation_id": citation.id,
        "chunk_id": citation.chunk_id,
        "document_id": doc.id,
        "document_name": doc.filename,
        "file_type": doc.file_type,
        "document_version": citation.document_version,
        "locator": citation.locator,
        "snippet": citation.snippet,
        "similarity_score": round(citation.similarity_score, 3)
    }
