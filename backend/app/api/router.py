from fastapi import APIRouter

from app.api.routes import (
    auth,
    projects,
    members,
    documents,
    instructions,
    rag,
    chat,
    conversations,
    memory,
    summary,
    branching,
    branches,
    health,
)

api_router = APIRouter()

api_router.include_router(health.router)

api_router.include_router(auth.router)
api_router.include_router(projects.router)
api_router.include_router(members.router)
api_router.include_router(documents.router)
api_router.include_router(instructions.router)
api_router.include_router(rag.router)
api_router.include_router(chat.router)
api_router.include_router(conversations.router)
api_router.include_router(memory.router)
api_router.include_router(summary.router)
api_router.include_router(branching.router)
api_router.include_router(branches.router)
