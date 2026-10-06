import pytest
import asyncio
from pathlib import Path
from services.api.database import engine, Base, AsyncSessionLocal
from services.api.auth import get_or_create_default_user_and_workspace
from services.api.models import Document
from services.worker.worker import DocumentWorker

@pytest.fixture(autouse=True)
async def setup_db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    async with AsyncSessionLocal() as session:
        await get_or_create_default_user_and_workspace(session)
    yield

@pytest.mark.asyncio
async def test_worker_processing_cycle():
    sample_file = Path("sample_docs/rag_research_brief.txt")
    assert sample_file.exists()

    async with AsyncSessionLocal() as db:
        user, ws = await get_or_create_default_user_and_workspace(db)
        doc = Document(
            workspace_id=ws.id,
            filename="worker_test.txt",
            file_type="txt",
            storage_key=str(sample_file),
            status="queued"
        )
        db.add(doc)
        await db.commit()
        await db.refresh(doc)
        doc_id = doc.id

    worker = DocumentWorker()
    await worker._process_next_job()

    async with AsyncSessionLocal() as db:
        from sqlalchemy import select
        res = await db.execute(select(Document).where(Document.id == doc_id))
        updated_doc = res.scalar_one()
        assert updated_doc.status == "ready"
        assert updated_doc.chunk_count > 0
