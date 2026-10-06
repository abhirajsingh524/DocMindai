import time
import uuid
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from services.api.config import settings
from services.api.database import engine, Base, AsyncSessionLocal
from services.api.auth import get_or_create_default_user_and_workspace
from services.api.routers import health, auth, documents, conversations, citations, stats, operations

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("docmind.api")

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Initializing DocMind AI database tables...")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    # Seed default user and workspace
    async with AsyncSessionLocal() as session:
        await get_or_create_default_user_and_workspace(session)
    logger.info("DocMind AI backend initialized successfully.")
    yield
    logger.info("Shutting down DocMind AI API...")

app = FastAPI(
    title="DocMind AI — Document Research & Semantic RAG API",
    description="FastAPI service for semantic document search, FAISS retrieval, and APINEX free/glm-5.3-flash synthesis with verified citations.",
    version="1.0.0",
    lifespan=lifespan
)

# CORS configuration
origins = [o.strip() for o in settings.CORS_ORIGINS.split(",") if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins if origins else ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Timing and Request-ID middleware
@app.middleware("http")
async def add_process_time_and_id(request: Request, call_next):
    req_id = request.headers.get("x-request-id", str(uuid.uuid4()))
    start_time = time.perf_counter()
    response = await call_next(request)
    duration_ms = (time.perf_counter() - start_time) * 1000
    response.headers["X-Request-ID"] = req_id
    response.headers["X-Response-Time-Ms"] = f"{duration_ms:.2f}"
    return response

# Include Routers
app.include_router(health.router)
app.include_router(auth.router)
app.include_router(documents.router)
app.include_router(conversations.router)
app.include_router(citations.router)
app.include_router(stats.router)
app.include_router(operations.router)

@app.get("/")
async def root():
    return {
        "app": "DocMind AI",
        "status": "online",
        "docs": "/docs",
        "model": settings.APINEX_MODEL,
        "provider": settings.LLM_PROVIDER
    }
