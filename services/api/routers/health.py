from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession
from services.api.database import get_db
from services.api.config import settings
from pathlib import Path

router = APIRouter(tags=["Health"])

@router.get("/health/live")
async def health_live():
    return {"status": "alive", "service": "docmind-api"}

@router.get("/health/ready")
async def health_ready(db: AsyncSession = Depends(get_db)):
    db_status = "unknown"
    try:
        await db.execute(text("SELECT 1"))
        db_status = "connected"
    except Exception as e:
        db_status = f"unreachable ({str(e)})"

    storage_ok = Path(settings.STORAGE_DIR).exists()
    index_ok = Path(settings.INDEX_DIR).exists()

    return {
        "status": "ready" if db_status == "connected" and storage_ok and index_ok else "degraded",
        "database": db_status,
        "storage": "ok" if storage_ok else "missing",
        "index_storage": "ok" if index_ok else "missing",
        "llm_provider": settings.LLM_PROVIDER,
        "llm_model": settings.APINEX_MODEL,
        "llm_configured": bool(settings.APINEX_API_KEY)
    }
