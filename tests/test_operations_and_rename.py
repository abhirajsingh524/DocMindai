import pytest
from httpx import AsyncClient, ASGITransport
from services.api.main import app
from services.api.database import engine, Base, AsyncSessionLocal
from services.api.auth import get_or_create_default_user_and_workspace
from services.api.models import Document

@pytest.fixture(autouse=True)
async def setup_db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    async with AsyncSessionLocal() as session:
        await get_or_create_default_user_and_workspace(session)
    yield

@pytest.mark.asyncio
async def test_document_rename():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # Create a document record
        async with AsyncSessionLocal() as db:
            user, ws = await get_or_create_default_user_and_workspace(db)
            doc = Document(
                workspace_id=ws.id,
                filename="original_name.txt",
                file_type="txt",
                storage_key="test_storage",
                status="ready"
            )
            db.add(doc)
            await db.commit()
            await db.refresh(doc)
            doc_id = doc.id

        # Rename document via PATCH
        res = await ac.patch(f"/api/v1/documents/{doc_id}", json={"filename": "renamed_doc.txt"})
        assert res.status_code == 200
        assert res.json()["filename"] == "renamed_doc.txt"

        # Verify through GET
        get_res = await ac.get(f"/api/v1/documents/{doc_id}")
        assert get_res.status_code == 200
        assert get_res.json()["filename"] == "renamed_doc.txt"

@pytest.mark.asyncio
async def test_owner_operations_backlog():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        res = await ac.get("/api/v1/operations/backlog")
        assert res.status_code == 200
        data = res.json()
        assert "queue_length" in data
        assert "failed_jobs_count" in data
        assert "latencies" in data
        assert data["latencies"]["p95_retrieval_ms"] <= 50
