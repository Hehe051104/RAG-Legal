# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Chinese legal RAG chatbot with IRAC analysis framework. Users ask legal questions; the system retrieves relevant laws/judicial interpretations/cases from a ChromaDB vector database and generates structured legal analysis using IRAC methodology (Issue, Rule, Application, Conclusion) via a local LLM (Qwen 2.5 7B via Ollama). The frontend is a Next.js chat UI.

## Project Structure

```
├── src/                    # Core business code
│   ├── RAG.py             # Query rewriting + LLM calls (IRAC prompts)
│   ├── search.py          # Hybrid retrieval (tag + vector)
│   ├── rerank.py          # Cross-encoder reranking
│   ├── config.py          # Central config
│   ├── api_server.py      # FastAPI entry point
│   ├── database.py        # SQLAlchemy async DB
│   ├── models.py          # Data models
│   ├── utils.py           # Utilities (email, auth)
│   ├── injest.py          # Embedding + ChromaDB ingestion
│   ├── data_process.py    # .docx parsing
│   └── routers/auth.py    # Auth endpoints
├── scripts/                # Utility scripts
│   ├── create_registry.py
│   ├── generate_cases.py
│   ├── scrape_legal_data.py
│   ├── process_and_ingest.py
│   └── main_cli.py
├── data/                   # All data files
│   ├── 法律原文/           # 26 law .docx files
│   ├── 司法解释/           # 9 judicial interpretation .docx files
│   ├── 案例/               # 200+ case .docx files
│   ├── code_json/          # Parsed law JSON
│   ├── case_json/          # Parsed case JSON
│   ├── interpretation_json/
│   ├── legal_vector_db/    # ChromaDB database
│   └── registry.json
├── next-app/               # Next.js frontend
├── src/                    # Core business code (api_server.py 为入口)
├── requirements.txt
├── CLAUDE.md
└── .env / .env.example
```

## Running the Project

**Backend (Python / FastAPI):**
```bash
pip install -r requirements.txt
ollama run Lusizo/qwen2.5-7b-instruct-1m   # start local LLM
python src/api_server.py                    # FastAPI on port 8000
```

**Frontend (Next.js):**
```bash
cd next-app
pnpm install
pnpm dev          # http://localhost:3000
```

**CLI REPL:**
```bash
python scripts/main_cli.py
```

**Data ingestion:**
```bash
python scripts/create_registry.py        # regenerate registry.json
python scripts/process_and_ingest.py     # parse + embed into ChromaDB
```

**Generate cases:**
```bash
python scripts/generate_cases.py         # generate 200+ case .docx files
```

## Architecture

**IRAC Legal Analysis Framework:**
- **Issue**: Query rewrite identifies core legal issues
- **Rule**: Hybrid retrieval finds relevant laws, interpretations, and cases
- **Application**: LLM applies rules to specific facts
- **Conclusion**: Structured legal opinion with risk warnings

**Three-stage RAG pipeline:**

1. **Offline**: `.docx` → `data_process.py` → `injest.py` → ChromaDB
2. **Online retrieval**: Query → `RAG.py:rewrite_query()` → `search.py:run_search()` (tag + vector) → `rerank.py:rerank_context()`
3. **Generation**: Ranked docs → `RAG.py:call_ollama_rag()` → IRAC-structured response

**Auth system:** Email verification, Argon2 hashing, JWT, Google OAuth, role-based access.

## Key Files

| File | Role |
|------|------|
| `src/api_server.py` | FastAPI app, chat endpoint with IRAC audit |
| `src/RAG.py` | Query rewriting, IRAC prompts, LLM calls |
| `src/search.py` | Hybrid retrieval (tag + vector, supports case numbers) |
| `src/rerank.py` | Cross-encoder reranking |
| `src/config.py` | Central config (PROJECT_ROOT, DATA_DIR, models) |
| `scripts/generate_cases.py` | 200+ case templates across 14 legal areas |

## Environment Variables

Copy `.env.example` → `.env`. Key vars: SMTP credentials, Google OAuth, `ADMIN_EMAIL_WHITELIST`.

## Conventions

- Backend uses async Python (FastAPI + SQLAlchemy async + aiosqlite)
- Frontend uses pnpm
- Legal documents are in Chinese; code comments mix Chinese and English
- `data/legal_vector_db/` contains pre-built ChromaDB
- `src/config.py` defines `PROJECT_ROOT` and `DATA_DIR` for all path references
- All scripts in `scripts/` add `src/` to sys.path before importing
- Use `D:\anaconda\envs\drl\python.exe` for Python with torch/chromadb
- Set `HF_ENDPOINT=https://hf-mirror.com` for HuggingFace model downloads
