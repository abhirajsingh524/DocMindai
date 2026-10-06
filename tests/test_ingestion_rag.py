import pytest
from pathlib import Path
from httpx import AsyncClient, ASGITransport
from services.api.main import app
from services.api.database import engine, Base, AsyncSessionLocal
from services.api.auth import get_or_create_default_user_and_workspace
from services.api.routers.documents import process_document_pipeline
from services.api.retrieval.vector_store import get_vector_store

@pytest.fixture(autouse=True)
async def setup_db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    async with AsyncSessionLocal() as session:
        await get_or_create_default_user_and_workspace(session)
    yield

@pytest.mark.asyncio
async def test_sample_document_ingestion_and_retrieval():
    sample_file = Path("sample_docs/rag_research_brief.txt")
    assert sample_file.exists()

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # 1. Upload document
        with open(sample_file, "rb") as f:
            files = {"file": ("rag_research_brief.txt", f, "text/plain")}
            upload_res = await ac.post("/api/v1/documents/upload", files=files)
            assert upload_res.status_code == 201
            doc_data = upload_res.json()
            doc_id = doc_data["id"]

        # 2. Get me to obtain workspace id
        me_res = await ac.get("/api/v1/auth/me")
        ws_id = me_res.json()["workspace"]["id"]

        # Run pipeline directly
        await process_document_pipeline(doc_id, str(sample_file), "txt", ws_id)

        # 3. Verify document is ready
        doc_res = await ac.get(f"/api/v1/documents/{doc_id}")
        assert doc_res.status_code == 200
        doc_detail = doc_res.json()
        assert doc_detail["status"] == "ready"
        assert doc_detail["chunk_count"] > 0

        # 4. Verify vector search in FAISS
        vstore = get_vector_store(ws_id)
        results = await vstore.search("What is the latency of FAISS CPU?")
        assert len(results) > 0
        top = results[0]
        assert "FAISS" in top.text or "latency" in top.text or "50ms" in top.text
        assert top.document_id == doc_id
