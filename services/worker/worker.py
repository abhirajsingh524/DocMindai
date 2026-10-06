import asyncio
import logging
from sqlalchemy import select, update
from services.api.database import AsyncSessionLocal
from services.api.models import Job, Document, Chunk
from services.api.routers.documents import process_document_pipeline

logging.basicConfig(level=logging.INFO, format="%(asctime)s [WORKER] %(levelname)s: %(message)s")
logger = logging.getLogger("docmind.worker")

class DocumentWorker:
    def __init__(self, poll_interval: float = 3.0):
        self.poll_interval = poll_interval
        self._running = False

    async def start(self):
        self._running = True
        logger.info("DocMind Ingestion Worker started. Polling for queued documents...")
        while self._running:
            try:
                await self._process_next_job()
            except Exception as e:
                logger.error(f"Worker iteration error: {e}", exc_info=True)
            await asyncio.sleep(self.poll_interval)

    def stop(self):
        logger.info("Stopping worker...")
        self._running = False

    async def _process_next_job(self):
        async with AsyncSessionLocal() as db:
            # Query queued documents
            stmt = (
                select(Document)
                .where(Document.status.in_(["queued"]))
                .order_by(Document.created_at.asc())
                .limit(1)
            )
            res = await db.execute(stmt)
            doc = res.scalar_one_or_none()
            if not doc:
                return

            logger.info(f"Found queued document '{doc.filename}' (ID: {doc.id}). Processing...")
            await process_document_pipeline(
                document_id=doc.id,
                file_path=doc.storage_key,
                file_type=doc.file_type,
                workspace_id=doc.workspace_id
            )
            logger.info(f"Finished pipeline for document ID: {doc.id}")

if __name__ == "__main__":
    worker = DocumentWorker()
    try:
        asyncio.run(worker.start())
    except KeyboardInterrupt:
        worker.stop()
