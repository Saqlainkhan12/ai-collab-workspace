from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.db.init_db import init_db
from app.api.router import api_router

app = FastAPI(
    title="AI Collaborative Project Workspace",
    version="0.1.0"
)

cors_origins = list(
    {
        settings.FRONTEND_URL.rstrip("/"),
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:8000",
        "http://127.0.0.1:8000",
    }
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix="/api")


@app.on_event("startup")
async def startup():
    try:
        await init_db()
    except Exception as exc:
        print(f"[Warning] Database initialization on startup: {exc}")


@app.get("/")
async def root():
    return {
        "status": "online",
        "service": "AI Collaborative Project Workspace API",
        "version": "0.1.0",
        "docs": "/docs",
        "health": "/health",
        "frontend": "http://localhost:3000",
    }


@app.get("/health")
async def health():
    return {
        "status": "ok",
        "service": "AI Collaborative Project Workspace",
    }
