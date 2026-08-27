from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.db.init_db import init_db
from app.api.router import api_router

app = FastAPI(
    title="AI Collaborative Project Workspace",
    version="0.1.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.FRONTEND_URL],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix="/api")


@app.on_event("startup")
async def startup():
    await init_db()


@app.get("/health")
async def health():
    return {
        "status": "ok",
        "service": "AI Collaborative Project Workspace"
    }
