# Architecture Decision Records (ADRs)

## ADR-001: APINEX free/glm-5.3-flash Model Integration
- **Context**: The blueprint mandates the exact model identifier `free/glm-5.3-flash` on `https://api.apinex.bond/v1` for LLM completion.
- **Decision**: Implement an async httpx client in `services/api/llm/apinex.py` handling OpenAI-compatible chat completion and SSE streaming. Include a resilient local mock synthesizer fallback when `APINEX_API_KEY` is unset or offline, clearly labeling synthetic responses in logs and metrics.
- **Consequence**: Backend never crashes if API key is not yet configured by the user, while fully maintaining wire protocol fidelity.

## ADR-002: FAISS CPU Workspace Index Isolation
- **Context**: Document retrieval must be strictly workspace-scoped without leaking documents across tenants.
- **Decision**: Store FAISS index binaries and metadata mappings partitioned by `workspace_id` and indexed by chunk IDs. Writes produce versioned immutable snapshots.
- **Consequence**: Zero cross-workspace vector contamination and clean concurrent read safety.

## ADR-003: Embedding Model Selection
- **Context**: APINEX chat route does not provide vector embeddings. Blueprint specifies separating `EmbeddingProvider`.
- **Decision**: Use `sentence-transformers` with model `all-MiniLM-L6-v2` (384-d, fast CPU inference, multilingual/English competence) and a lightweight pure-python fallback for minimal installation footprint if torch is unavailable.
- **Consequence**: Highly accurate cosine similarity search with low latency and CPU efficiency.

## ADR-004: Frontend Motion SaaS UI Architecture
- **Context**: User requested a dynamic, motion-driven SaaS look with visual excellence (#0B1020 dark navy, cyan primary #56E6E0, violet #A78BFA).
- **Decision**: Built with React 19 / TypeScript, Vite, Tailwind CSS, Lucide icons, and framer-motion-style CSS transitions with tokenized color classes.
- **Consequence**: Ultra-modern, responsive workspace with zero fluff, fast initial paint, and interactive source inspection drawer.
