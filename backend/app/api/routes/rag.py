from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.database import get_db
from app.models.core import ProjectMember
from app.core.security import require_project_member
from app.services.rag import retrieve, build_context


router = APIRouter(
    prefix="/projects/{project_id}/rag",
    tags=["RAG"],
)


class RetrievalRequest(BaseModel):
    query: str
    limit: int = 6


@router.post("/retrieve")
async def retrieve_project_context(
    project_id: int,
    payload: RetrievalRequest,
    membership: ProjectMember = Depends(
        require_project_member
    ),
    db: AsyncSession = Depends(get_db),
):
    chunks = await retrieve(
        query=payload.query,
        project_id=project_id,
        db=db,
        limit=min(max(payload.limit, 1), 12),
    )

    return {
        "project_id": project_id,
        "query": payload.query,
        "chunks": chunks,
        "context": build_context(chunks),
    }
