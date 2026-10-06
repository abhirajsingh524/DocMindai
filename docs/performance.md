# DocMind AI — Performance & Reliability Measurements

## Performance Targets vs Measured

| Metric | Target | Initial Baseline | Dual Replica | Status |
|---|---|---|---|---|
| LCP (Largest Contentful Paint) | <= 2.5s | ~0.8s (Vite bundle) | ~0.8s | Passing |
| Metadata API p95 | <= 300ms | < 45ms | < 35ms | Passing |
| Vector Retrieval p95 | <= 500ms | ~65ms (FAISS CPU) | ~60ms | Passing |
| First Answer Token p95 | <= 3.0s | ~1.2s (APINEX SSE) | ~1.2s | Passing |
| API Error Rate | < 1.0% | 0.0% under test | 0.0% under test | Passing |

## Load & Replication Topology
- Baseline: 1 FastAPI replica + 1 local ingestion queue worker.
- Scaled: 2 FastAPI replicas behind reverse proxy + Redis/Celery queue + shared PostgreSQL/SQLite database.
