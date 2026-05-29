from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.db.session import engine, Base
from app.api.auth_router import router as auth_router
from app.api.chat_router import router as chat_router
from app.core.config import settings

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="API for Pharma Premium platform",
    version=settings.PROJECT_VERSION
)

@app.on_event("startup")
async def startup_event():
    import threading
    def background_init():
        from app.api.chat_router import auto_seed
        from app.services.rag_service import rag_engine
        print("RAG System: Initializing in background...")
        auto_seed()
        print("RAG System: Background initialization complete!")

    thread = threading.Thread(target=background_init)
    thread.start()

# CORS — allow React dev server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],   #http
    allow_headers=["*"],   #authentication headers, content-type,JSON
)

app.include_router(auth_router)
app.include_router(chat_router)


@app.get("/")
def root():
    return {"message": "Pharma Premium API is running", "docs": "/docs"}


@app.get("/health")
def health_check():
    return {"status": "healthy"}
