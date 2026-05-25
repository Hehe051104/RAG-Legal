# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Chinese legal RAG chatbot. Users ask legal questions; the system retrieves relevant laws/judicial interpretations from a ChromaDB vector database and generates answers using a local LLM (Qwen 2.5 7B via Ollama). The frontend is a Next.js chat UI.

## Running the Project

**Backend (Python / FastAPI):**
```bash
pip install -r requirements.txt
ollama run Lusizo/qwen2.5-7b-instruct-1m   # start local LLM
python api_server.py                         # FastAPI on port 8000, docs at /docs
```

**Frontend (Next.js):**
```bash
cd next-app
pnpm install
pnpm dev          # http://localhost:3000
pnpm build        # production build
```

**CLI REPL (no frontend needed):**
```bash
python "main(search+RAG+rerank).py"
```

**Testing:**
- Backend: `python scripts/debug_auth_flow.py` (auth integration test), `python test_email.py`
- Frontend: `cd next-app && pnpm test` (Playwright E2E)

**Data ingestion (adding new legal documents):**
1. Place .docx in `法律原文/` (laws) or `司法解释/` (judicial interpretations)
2. `python create_registry.py` -- regenerate `registry.json`
3. `python "process+injest(一键批量完成).py"` -- parse + embed into ChromaDB

## Architecture

Three-stage RAG pipeline:

**Offline pipeline:** `.docx` → `data_process.py` (parse to JSON) → `injest.py` (embed with Qwen3-Embedding-0.6B) → `legal_vector_db/` (ChromaDB)

**Online retrieval:** User query → `RAG.py:rewrite_query()` (LLM intent analysis + keyword extraction) → `search.py:run_search()` (two parallel tracks: tag-based exact lookup for article references like "刑法第2条", and semantic vector search) → `rerank.py:rerank_context()` (BAAI/bge-reranker-v2-m3 cross-encoder; VIP tag-hits get score 999.0 and bypass filtering)

**Generation:** Ranked docs + query → `RAG.py:call_ollama_rag()` → Ollama → structured JSON response (success/need_clarify/reject_non_legal/rewrite) with source citations

**Auth system:** Email verification (6-digit code, HMAC-SHA256, 5-min TTL), Argon2 password hashing, JWT (HS256, 120min), Google OAuth, role-based (user/admin). Backend: `routers/auth.py`, `utils.py`, `models.py`, `database.py`.

## Key Files

| File | Role |
|------|------|
| `api_server.py` | FastAPI app, mounts auth router, chat endpoint |
| `RAG.py` | Query rewriting, LLM calls, audit logic |
| `search.py` | Hybrid retrieval (tag-based + vector) |
| `rerank.py` | Cross-encoder reranking |
| `data_process.py` | .docx parsing (two parsers: laws vs interpretations) |
| `injest.py` | Embedding + ChromaDB ingestion |
| `config.py` | Central config (model names, DB paths, defaults) |
| `routers/auth.py` | All auth endpoints |
| `next-app/app/(chat)/` | Chat UI pages and `/api/chat` route |
| `next-app/lib/api/auth.ts` | Frontend auth API client |
| `next-app/lib/ai/` | AI model config, prompts, tools |

## Environment Variables

Copy `.env.example` → `.env` (backend) and `next-app/.env.example` → `next-app/.env.local` (frontend). Key vars: SMTP credentials for email verification, Google OAuth client ID/secret, `ADMIN_EMAIL_WHITELIST` for admin role assignment.

## Conventions

- Backend uses async Python throughout (FastAPI + SQLAlchemy async + aiosqlite)
- Frontend uses pnpm, not npm or yarn
- Frontend linting: Biome (`pnpm check` in next-app/)
- Legal documents are in Chinese; code comments and variable names mix Chinese and English
- The `legal_vector_db/` directory contains a pre-built ChromaDB -- only regenerate when adding new documents
- `config.py` is the single source of truth for model names, paths, and default RAG parameters
