import pytest
from httpx import AsyncClient, ASGITransport
from services.api.main import app
from services.api.database import engine, Base, AsyncSessionLocal
from services.api.auth import get_or_create_default_user_and_workspace

@pytest.fixture(autouse=True)
async def setup_db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    async with AsyncSessionLocal() as session:
        await get_or_create_default_user_and_workspace(session)
    yield

@pytest.mark.asyncio
async def test_health_endpoints():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        res = await ac.get("/health/live")
        assert res.status_code == 200
        assert res.json()["status"] == "alive"

        res_ready = await ac.get("/health/ready")
        assert res_ready.status_code == 200
        data = res_ready.json()
        assert "status" in data
        assert data["database"] == "connected"

@pytest.mark.asyncio
async def test_auth_me_and_stats():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        me_res = await ac.get("/api/v1/auth/me")
        assert me_res.status_code == 200
        user_data = me_res.json()
        assert "user" in user_data
        assert "workspace" in user_data

        stats_res = await ac.get("/api/v1/stats")
        assert stats_res.status_code == 200
        stats = stats_res.json()
        assert stats["llm_model"] == "free/glm-5.3-flash"
        assert "total_documents" in stats

@pytest.mark.asyncio
async def test_conversation_flow():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        create_res = await ac.post("/api/v1/conversations", json={"title": "Test QA Chat", "document_scope": []})
        assert create_res.status_code == 200
        conv = create_res.json()
        assert conv["title"] == "Test QA Chat"
        conv_id = conv["id"]

        list_res = await ac.get("/api/v1/conversations")
        assert list_res.status_code == 200
        convs = list_res.json()
        assert any(c["id"] == conv_id for c in convs)
