import asyncio
import sys
from pathlib import Path

# Add project root to sys.path
BASE_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE_DIR))

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

from httpx import AsyncClient, ASGITransport
from services.api.main import app
from services.api.database import engine, Base, AsyncSessionLocal
from services.api.auth import get_or_create_default_user_and_workspace
from services.api.routers.documents import process_document_pipeline

async def run_full_system_verification():
    print("=" * 70)
    print("DocMind AI -- Live System Functionality Verification")
    print("=" * 70)

    # 1. DB Init
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    async with AsyncSessionLocal() as session:
        user, ws = await get_or_create_default_user_and_workspace(session)
    print(f"[PASS] 1. Database & Default Tenancy: OK (User: {user.email}, Workspace: {ws.slug})")

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        # 2. Health
        h_res = await client.get("/health/live")
        assert h_res.status_code == 200, f"Health live failed: {h_res.text}"
        r_res = await client.get("/health/ready")
        assert r_res.status_code == 200, f"Health ready failed: {r_res.text}"
        print(f"[PASS] 2. Health Check: OK ({r_res.json()['status']})")

        # 3. Auth Me
        me_res = await client.get("/api/v1/auth/me")
        assert me_res.status_code == 200
        me_data = me_res.json()
        print(f"[PASS] 3. Auth Profile: OK (Model: {me_data['llm_model']}, Provider: {me_data['llm_provider']})")

        # 4. Upload TXT Document
        txt_path = Path("sample_docs/rag_research_brief.txt")
        assert txt_path.exists()
        with open(txt_path, "rb") as f:
            up_res = await client.post("/api/v1/documents/upload", files={"file": ("rag_research_brief.txt", f, "text/plain")})
        assert up_res.status_code == 201, f"Upload TXT failed: {up_res.text}"
        txt_doc = up_res.json()
        await process_document_pipeline(txt_doc["id"], str(txt_path), "txt", ws.id)
        print(f"[PASS] 4. TXT Document Ingestion: OK (Doc ID: {txt_doc['id']})")

        # 5. Upload DOCX Document
        docx_path = Path("sample_docs/sample_research_paper.docx")
        assert docx_path.exists()
        with open(docx_path, "rb") as f:
            up_docx = await client.post("/api/v1/documents/upload", files={"file": ("sample_research_paper.docx", f, "application/vnd.openxmlformats-officedocument.wordprocessingml.document")})
        assert up_docx.status_code == 201, f"Upload DOCX failed: {up_docx.text}"
        docx_doc = up_docx.json()
        await process_document_pipeline(docx_doc["id"], str(docx_path), "docx", ws.id)
        print(f"[PASS] 5. DOCX Document Ingestion: OK (Doc ID: {docx_doc['id']})")

        # 6. Verify Documents List
        docs_res = await client.get("/api/v1/documents")
        assert docs_res.status_code == 200
        docs_list = docs_res.json()
        assert len(docs_list) >= 2
        print(f"[PASS] 6. Document Library Listing: OK ({len(docs_list)} documents in workspace)")

        # 7. Document Renaming
        rename_res = await client.patch(f"/api/v1/documents/{docx_doc['id']}", json={"filename": "renamed_research_paper.docx"})
        assert rename_res.status_code == 200
        assert rename_res.json()["filename"] == "renamed_research_paper.docx"
        print(f"[PASS] 7. Document Renaming: OK (Renamed to {rename_res.json()['filename']})")

        # 8. Document Content Inspection
        content_res = await client.get(f"/api/v1/documents/{txt_doc['id']}/content")
        assert content_res.status_code == 200
        assert "FAISS" in content_res.json()["content"]
        print(f"[PASS] 8. Extracted Content Inspection: OK")

        # 9. Create Conversation
        conv_res = await client.post("/api/v1/conversations", json={"title": "Verification Session", "document_scope": []})
        assert conv_res.status_code == 200
        conv_id = conv_res.json()["id"]
        print(f"[PASS] 9. Conversation Lifecycle: OK (Conv ID: {conv_id})")

        # 10. Send Message & Stream Answer
        print("         Testing SSE Stream generation...")
        stream_res = await client.post(
            f"/api/v1/conversations/{conv_id}/messages",
            json={"content": "What is the measured latency and vector dimension in FAISS?", "document_scope": []}
        )
        assert stream_res.status_code == 200
        stream_text = stream_res.text
        assert "event: progress" in stream_text
        assert "event: citations" in stream_text
        assert "event: delta" in stream_text
        assert "event: done" in stream_text
        print(f"[PASS] 10. SSE Stream & Citations: OK (Streamed progress, deltas, and completion)")

        # 11. Verify History & Citation Provenance
        msgs_res = await client.get(f"/api/v1/conversations/{conv_id}/messages")
        assert msgs_res.status_code == 200
        msgs = msgs_res.json()
        assert len(msgs) >= 2
        assistant_msg = [m for m in msgs if m["role"] == "assistant"][0]
        assert len(assistant_msg["citations"]) > 0
        citation = assistant_msg["citations"][0]
        print(f"[PASS] 11. Citation Provenance: OK (Citing {citation['document_name']} at {citation['locator']})")

        # 12. Inspect Source Endpoint
        cit_src_res = await client.get(f"/api/v1/citations/{citation['id']}/source")
        assert cit_src_res.status_code == 200
        assert cit_src_res.json()["citation_id"] == citation["id"]
        print(f"[PASS] 12. Source Inspection Endpoint: OK")

        # 13. Owner Backlog
        backlog_res = await client.get("/api/v1/operations/backlog")
        assert backlog_res.status_code == 200
        print(f"[PASS] 13. Owner Operations Backlog: OK (p95 retrieval: {backlog_res.json()['latencies']['p95_retrieval_ms']}ms)")

        # 14. Workspace Stats
        stats_res = await client.get("/api/v1/stats")
        assert stats_res.status_code == 200
        print(f"[PASS] 14. Workspace Stats: OK (Indexed chunks: {stats_res.json()['indexed_chunks']})")

        # 15. Delete Document
        del_res = await client.delete(f"/api/v1/documents/{txt_doc['id']}")
        assert del_res.status_code == 200
        print(f"[PASS] 15. Document Revocation & Cleanup: OK (Deleted {txt_doc['id']})")

    print("=" * 70)
    print("ALL 15 CORE SUBSYSTEM FUNCTIONS VERIFIED SUCCESSFULLY AND WORKING PROPERLY!")
    print("=" * 70)

if __name__ == "__main__":
    asyncio.run(run_full_system_verification())
