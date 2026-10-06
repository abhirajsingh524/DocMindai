# DocMind AI Implementation Tasks & Progress Tracking

## Milestone Roadmap

- [x] **Milestone 1: Repository Architecture, Docs & Environment Setup**
  - [x] Initial inspection of repository & blueprint
  - [x] Initialize `docs/` (architecture, tasks, decisions, performance, agent-progress)
  - [x] Create root `.env.example` with APINEX configuration and instructions
  - [x] Initialize project monorepo structure (`apps/web`, `services/api`, `services/retrieval`, `infra`, `sample_docs`)

- [x] **Milestone 2: Backend Core, FastAPIs, Data Models & Security**
  - [x] SQLite/PostgreSQL compatible async SQLAlchemy schemas (Workspaces, Users, Documents, Chunks, IndexVersions, Conversations, Messages, Citations, Jobs)
  - [x] Authentication & workspace tenancy dependency injection
  - [x] Health endpoints (`/health/live`, `/health/ready`)
  - [x] Document upload & ingestion pipeline (`/api/v1/uploads`, `/api/v1/documents`)
  - [x] Chunking & local/sentence embedding pipeline + FAISS CPU vector index
  - [x] APINEX LLM Client (`free/glm-5.3-flash`) with SSE streaming & graceful mock mode for offline testing
  - [x] Citations resolving & source passage endpoint (`/api/v1/citations/{id}/source`)
  - [x] Unit & integration tests for backend (8 tests passing)

- [x] **Milestone 3: Modern Motion SaaS Frontend (`apps/web`)**
  - [x] React + TypeScript + Vite + Tailwind/Modern Design System
  - [x] Curated Color Palette (#0B1020, #151D35, #1C2742, #34425D, #56E6E0 cyan, #A78BFA violet)
  - [x] Dynamic SaaS shell: collapsible sidebar, workspace selector, responsive drawer
  - [x] Document library: upload modal, drag-and-drop, real-time status badges, retry, deletion confirmation
  - [x] Chat workspace: scope chips, streaming answers, token batching, stop generation, follow-up recommendations, copy, feedback
  - [x] Interactive Citations Drawer & Source Passage Viewer
  - [x] Conversation history: search, rename, delete, persistence
  - [x] Settings modal (API key configuration indicator, theme, language preference)
  - [x] Overview dashboard with live stats and quick actions

- [x] **Milestone 4: End-to-End Testing & Verification**
  - [x] Test synthetic PDF, DOCX, and TXT document ingestion
  - [x] Test FAISS vector search & precision retrieval
  - [x] Verify APINEX stream parsing and citation mapping
  - [x] Responsive browser verification across desktop and mobile widths

- [x] **Milestone 5: Production Deployment, Multi-Replica Topology & Performance Benchmarks**
  - [x] Dockerfile for Web, FastAPI API, and Worker
  - [x] `docker-compose.yml` demonstrating multi-replica API topology and shared state
  - [x] Performance measurement report (`docs/performance.md`)
  - [x] Git commit & push loop
