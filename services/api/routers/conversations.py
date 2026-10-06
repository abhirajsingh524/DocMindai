import json
import asyncio
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import AsyncSession

from services.api.config import settings
from services.api.database import get_db, AsyncSessionLocal
from services.api.models import Conversation, Message, Citation, Document, Workspace, User
from services.api.auth import get_current_user, get_current_workspace
from services.api.retrieval.vector_store import get_vector_store
from services.api.llm.apinex import apinex_client, format_context_prompt

router = APIRouter(prefix="/api/v1/conversations", tags=["Conversations & Q&A"])

class CreateConversationRequest(BaseModel):
    title: Optional[str] = "Document Research Session"
    document_scope: Optional[List[str]] = []

class UpdateConversationRequest(BaseModel):
    title: Optional[str] = None
    document_scope: Optional[List[str]] = None

class SendMessageRequest(BaseModel):
    content: str
    document_scope: Optional[List[str]] = None

@router.post("")
async def create_conversation(
    req: CreateConversationRequest,
    user: User = Depends(get_current_user),
    workspace: Workspace = Depends(get_current_workspace),
    db: AsyncSession = Depends(get_db)
):
    conv = Conversation(
        workspace_id=workspace.id,
        user_id=user.id,
        title=req.title or "Document Research Session",
        document_scope=json.dumps(req.document_scope or [])
    )
    db.add(conv)
    await db.commit()
    await db.refresh(conv)

    return {
        "id": conv.id,
        "title": conv.title,
        "workspace_id": conv.workspace_id,
        "document_scope": json.loads(conv.document_scope),
        "created_at": conv.created_at.isoformat()
    }

@router.get("")
async def list_conversations(
    workspace: Workspace = Depends(get_current_workspace),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    stmt = (
        select(Conversation)
        .where(Conversation.workspace_id == workspace.id)
        .order_by(Conversation.updated_at.desc())
    )
    res = await db.execute(stmt)
    convs = res.scalars().all()

    return [
        {
            "id": c.id,
            "title": c.title,
            "document_scope": json.loads(c.document_scope or "[]"),
            "created_at": c.created_at.isoformat(),
            "updated_at": c.updated_at.isoformat()
        }
        for c in convs
    ]

@router.get("/{id}")
async def get_conversation(
    id: str,
    workspace: Workspace = Depends(get_current_workspace),
    db: AsyncSession = Depends(get_db)
):
    res = await db.execute(
        select(Conversation).where(Conversation.id == id, Conversation.workspace_id == workspace.id)
    )
    conv = res.scalar_one_or_none()
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")

    return {
        "id": conv.id,
        "title": conv.title,
        "document_scope": json.loads(conv.document_scope or "[]"),
        "created_at": conv.created_at.isoformat(),
        "updated_at": conv.updated_at.isoformat()
    }

@router.patch("/{id}")
async def update_conversation(
    id: str,
    req: UpdateConversationRequest,
    workspace: Workspace = Depends(get_current_workspace),
    db: AsyncSession = Depends(get_db)
):
    res = await db.execute(
        select(Conversation).where(Conversation.id == id, Conversation.workspace_id == workspace.id)
    )
    conv = res.scalar_one_or_none()
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")

    if req.title is not None:
        conv.title = req.title
    if req.document_scope is not None:
        conv.document_scope = json.dumps(req.document_scope)

    await db.commit()
    return {"id": conv.id, "title": conv.title, "document_scope": json.loads(conv.document_scope)}

@router.delete("/{id}")
async def delete_conversation(
    id: str,
    workspace: Workspace = Depends(get_current_workspace),
    db: AsyncSession = Depends(get_db)
):
    res = await db.execute(
        select(Conversation).where(Conversation.id == id, Conversation.workspace_id == workspace.id)
    )
    conv = res.scalar_one_or_none()
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")

    # Cascades will delete messages and citations
    await db.execute(delete(Conversation).where(Conversation.id == id))
    await db.commit()
    return {"status": "deleted", "id": id}

@router.get("/{id}/messages")
async def get_messages(
    id: str,
    workspace: Workspace = Depends(get_current_workspace),
    db: AsyncSession = Depends(get_db)
):
    # Verify conversation belongs to workspace
    conv_res = await db.execute(
        select(Conversation).where(Conversation.id == id, Conversation.workspace_id == workspace.id)
    )
    if not conv_res.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Conversation not found")

    stmt = select(Message).where(Message.conversation_id == id).order_by(Message.created_at.asc())
    msg_res = await db.execute(stmt)
    messages = msg_res.scalars().all()

    result = []
    for m in messages:
        # Load citations for assistant messages
        citations = []
        if m.role == "assistant":
            cit_res = await db.execute(select(Citation).where(Citation.message_id == m.id))
            citations = [
                {
                    "id": c.id,
                    "chunk_id": c.chunk_id,
                    "document_id": c.document_id,
                    "document_name": c.document_name,
                    "document_version": c.document_version,
                    "locator": c.locator,
                    "snippet": c.snippet,
                    "similarity_score": c.similarity_score
                }
                for c in cit_res.scalars().all()
            ]

        result.append({
            "id": m.id,
            "role": m.role,
            "content": m.content,
            "status": m.status,
            "model": m.model,
            "created_at": m.created_at.isoformat(),
            "citations": citations
        })

    return result

@router.post("/{id}/messages")
async def send_message(
    id: str,
    req: SendMessageRequest,
    workspace: Workspace = Depends(get_current_workspace),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    # Verify conversation
    conv_res = await db.execute(
        select(Conversation).where(Conversation.id == id, Conversation.workspace_id == workspace.id)
    )
    conv = conv_res.scalar_one_or_none()
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")

    # Scope determination
    effective_scope = req.document_scope if req.document_scope is not None else json.loads(conv.document_scope or "[]")

    # Save user message
    user_msg = Message(
        conversation_id=conv.id,
        role="user",
        content=req.content.strip(),
        status="complete"
    )
    db.add(user_msg)
    await db.commit()
    await db.refresh(user_msg)

    # Automatically set conversation title if it's the first question
    if conv.title in ["Document Research Session", "New Research Session", ""]:
        conv.title = req.content[:35] + ("..." if len(req.content) > 35 else "")
        await db.commit()

    # Pre-fetch past conversation history
    past_msgs_res = await db.execute(
        select(Message)
        .where(Message.conversation_id == conv.id, Message.id != user_msg.id)
        .order_by(Message.created_at.asc())
    )
    past_messages = [{"role": m.role, "content": m.content} for m in past_msgs_res.scalars().all()]

    async def sse_event_stream():
        # Step 1: Notify retrieving
        yield f"event: progress\ndata: {json.dumps({'stage': 'retrieving', 'text': 'Retrieving semantic passages from vector index...'})}\n\n"
        await asyncio.sleep(0.05)

        # Step 2: Vector Search
        vstore = get_vector_store(workspace.id)
        scored_chunks = await vstore.search(
            query=req.content,
            document_scope=effective_scope if effective_scope else None,
            top_k=settings.TOP_K_CANDIDATES,
            threshold=settings.SIMILARITY_THRESHOLD
        )

        citations_payload = [
            {
                "chunk_id": sc.chunk_id,
                "document_id": sc.document_id,
                "document_name": sc.document_name,
                "document_version": sc.document_version,
                "locator": sc.locator,
                "snippet": sc.text[:220] + "..." if len(sc.text) > 220 else sc.text,
                "similarity_score": round(sc.score, 3)
            }
            for sc in scored_chunks
        ]

        yield f"event: citations\ndata: {json.dumps(citations_payload)}\n\n"
        yield f"event: progress\ndata: {json.dumps({'stage': 'generating', 'text': f'Synthesizing answer using {settings.APINEX_MODEL}...'})}\n\n"

        # Step 3: Format prompt for APINEX
        llm_messages = format_context_prompt(
            question=req.content,
            scored_chunks=scored_chunks[:settings.FINAL_PASSAGES_COUNT],
            chat_history=past_messages
        )

        # Step 4: Stream tokens
        full_content_acc = []
        try:
            async for token in apinex_client.stream_completion(llm_messages):
                full_content_acc.append(token)
                yield f"event: delta\ndata: {json.dumps({'delta': token})}\n\n"
        except Exception as e:
            err_msg = f"\n[DocMind Error]: Stream interrupted: {str(e)}"
            full_content_acc.append(err_msg)
            yield f"event: delta\ndata: {json.dumps({'delta': err_msg})}\n\n"

        final_text = "".join(full_content_acc)

        # Step 5: Persist assistant response & citations in DB
        async with AsyncSessionLocal() as save_db:
            assistant_msg = Message(
                conversation_id=conv.id,
                role="assistant",
                content=final_text,
                status="complete",
                model=settings.APINEX_MODEL
            )
            save_db.add(assistant_msg)
            await save_db.commit()
            await save_db.refresh(assistant_msg)

            # Persist citations
            persisted_citations = []
            for sc in scored_chunks[:settings.FINAL_PASSAGES_COUNT]:
                cit = Citation(
                    message_id=assistant_msg.id,
                    chunk_id=sc.chunk_id,
                    document_id=sc.document_id,
                    document_name=sc.document_name,
                    document_version=sc.document_version,
                    locator=sc.locator,
                    snippet=sc.text,
                    similarity_score=sc.score
                )
                save_db.add(cit)
                persisted_citations.append({
                    "id": cit.id,
                    "chunk_id": sc.chunk_id,
                    "document_id": sc.document_id,
                    "document_name": sc.document_name,
                    "locator": sc.locator,
                    "snippet": sc.text,
                    "similarity_score": round(sc.score, 3)
                })
            await save_db.commit()

            yield f"event: done\ndata: {json.dumps({'message_id': assistant_msg.id, 'citations': persisted_citations})}\n\n"

    return StreamingResponse(
        sse_event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )

@router.post("/generations/{id}/cancel")
async def cancel_generation(id: str):
    # Best-effort cancellation acknowledgment
    return {"status": "cancelled", "generation_id": id}
