# DocMind AI Implementation Tasks & Progress Tracking

## Milestone Roadmap

- [ ] **Milestone 1: Repository Architecture, Docs & Environment Setup**
  - [x] Initial inspection of repository & blueprint
  - [ ] Initialize `docs/` (architecture, tasks, decisions, performance, agent-progress)
  - [ ] Create root `.env.example` with APINEX configuration and instructions
  - [ ] Initialize project monorepo structure (`apps/web`, `services/api`, `services/retrieval`, `infra`, `sample_docs`)

- [ ] **Milestone 2: Backend Core, FastAPIs, Data Models & Security**
  - [ ] SQLite/PostgreSQL compatible async SQLAlchemy schemas (Workspaces, Users, Documents, Chunks, IndexVersions, Conversations, Messages, Citations, Jobs)
  - [ ] Authentication & workspace tenancy dependency injection
  - [ ] Health endpoints (`/health/live`, `/health/ready`)
  - [ ] Document upload & ingestion pipeline (`/api/v1/uploads`, `/api/v1/documents`)
  - [ ] Chunking & local/sentence embedding pipeline + FAISS CPU vector index
  - [ ] APINEX LLM Client (`free/glm-5.3-flash`) with SSE streaming & graceful mock mode for offline testing
  - [ ] Citations resolving & source passage endpoint (`/api/v1/citations/{id}/source`)
  - [ ] Unit & integration tests for backend

- [ ] **Milestone 3: Modern Motion SaaS Frontend (`apps/web`)**
  - [ ] React + TypeScript + Vite + Tailwind/Modern Design System
  - [ ] Curated Color Palette (#0B1020, #151D35, #1C2742, #34425D, #56E6E0 cyan, #A78BFA violet)
  - [ ] Dynamic SaaS shell: collapsible sidebar, workspace selector, responsive drawer
  - [ ] Document library: upload modal, drag-and-drop, real-time status badges, retry, deletion confirmation
  - [ ] Chat workspace: scope chips, streaming answers, token batching, stop generation, follow-up recommendations, copy, feedback
  - [ ] Interactive Citations Drawer & Source Passage Viewer
  - [ ] Conversation history: search, rename, delete, persistence
  - [ ] Settings modal (API key configuration indicator, theme, language preference)
  - [ ] Overview dashboard with live stats and quick actions

- [ ] **Milestone 4: End-to-End Testing & Verification**
  - [ ] Test synthetic PDF, DOCX, and TXT document ingestion
  - [ ] Test FAISS vector search & precision retrieval
  - [ ] Verify APINEX stream parsing and citation mapping
  - [ ] Responsive browser verification across desktop and mobile widths

- [ ] **Milestone 5: Production Deployment, Multi-Replica Topology & Performance Benchmarks**
  - [ ] Dockerfile for Web, FastAPI API, and Worker
  - [ ] `docker-compose.yml` demonstrating multi-replica API topology and shared state
  - [ ] Performance measurement report (`docs/performance.md`)
  - [ ] Git commit & push loop
