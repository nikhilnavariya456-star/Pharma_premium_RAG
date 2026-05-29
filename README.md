# Pharma Premium — RAG-powered Pharmaceutical Assistant

Pharma Premium is a full-stack retrieval-augmented generation (RAG) chatbot for pharmaceutical information. It pairs a FastAPI backend (FAISS-based vector retrieval + LLM) with a React frontend and MySQL persistence. The app is containerized with Docker Compose for easy deployment.

**Short summary:** Backend serves an API (auth + chat) and initializes a FAISS index on startup; frontend provides a chat UI and auth pages.

## Key Features
- RAG pipeline using FAISS and SentenceTransformers
- Authentication (JWT) and user management
- React + Vite frontend with a chat widget
- Docker Compose orchestration with MySQL

## Tech Stack
- Backend: FastAPI, SQLAlchemy, PyMySQL, FAISS, SentenceTransformers, LangChain integrations
- Frontend: React 19, Vite, Axios, React Router
- Database: MySQL 8
- Deployment: Docker Compose

## Quick Start (Docker)
1. Copy environment file and fill values:

```bash
cp .env.example .env
# edit .env with DB credentials, API keys, etc.
```

2. Build and run everything:

```bash
docker-compose up --build
```

The backend will be available on port `8000` and the frontend on port `80` by default.

## Local Development

Backend (Windows example):

```powershell
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

Frontend:

```bash
cd frontend
cp .env.example .env  # set VITE_API_URL to backend URL
npm install
npm run dev
```

## Environment
- See `.env.example` at project root. Important vars: DB_NAME, DB_PASSWORD, VITE_API_URL, any model/API keys required by the RAG/LLM integrations.

## Project Structure (high level)
```
./
├─ backend/                # FastAPI app and services
│  ├─ app/
│  │  ├─ api/              # routers: auth_router, chat_router
│  │  ├─ core/             # config, security
│  │  ├─ db/               # models.py, session.py
│  │  ├─ schemas/          # request/response models
│  │  └─ services/         # rag_service.py (FAISS + LLM glue)
├─ frontend/               # React + Vite app
├─ data/                   # persisted FAISS index: faiss_index.idx
├─ docker-compose.yml
└─ README.md
```

## Notable Implementation Details
- The backend starts a background thread to run `auto_seed()` and initialize the RAG engine on startup: see [backend/app/main.py](backend/app/main.py#L1-L40).
- A prebuilt FAISS index is present at `data/faiss_index.idx` (if present) and the service uses it to retrieve context for the LLM.

## Common Commands
- Run database migrations or scripts: `python scripts/migrate_db.py` (from project root)
- Run tests (if any): add test runner/commands — none included by default

## Troubleshooting
- If backend cannot connect to DB, verify `.env` values and that MySQL container is healthy.
- If FAISS or sentence-transformers fail to import in Docker, ensure the base image supports required native libs (FAISS CPU wheel present in `requirements.txt`).

## Where to Look in Code
- API entrypoint: [backend/app/main.py](backend/app/main.py#L1-L120)
- RAG logic: [backend/app/services/rag_service.py](backend/app/services/rag_service.py)
- Chat router: [backend/app/api/chat_router.py](backend/app/api/chat_router.py)
- Frontend entry: [frontend/src/main.jsx](frontend/src/main.jsx)

## License
This repository does not include a license file. Add one if you plan to publish or share the code.

---
If you'd like, I can also:
- add a short `CONTRIBUTING.md` and `ENVIRONMENT.md`, or
- generate a `.env.example` checklist with the required variables detected from `backend/core/config.py`.
