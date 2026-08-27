from fastapi import APIRouter, Depends
from pydantic import BaseModel

from sqlalchemy.ext.asyncio import AsyncSession

from app.db.database import get_db
from app.models.core import User, ProjectMember
from app.core.security import (
    get_current_user,
    require_project_member,
)

from app.services.memory import (
    save_memory,
    retrieve_memories,
)


router = APIRouter(
    prefix="/projects/{project_id}/memory",
    tags=["Memory"],
)


class MemoryCreate(BaseModel):
    content: str
    scope: str
    conversation_id: int | None = None


class MemorySearch(BaseModel):
    query: str
    conversation_id: int | None = None
    limit: int = 6


@router.post("")
async def create_memory(
    project_id: int,
    payload: MemoryCreate,
    user: User = Depends(get_current_user),
    membership: ProjectMember = Depends(
        require_project_member
    ),
    db: AsyncSession = Depends(get_db),
):
    memory = await save_memory(
        db=db,
        project_id=project_id,
        content=payload.content,
        scope=payload.scope,
        conversation_id=payload.conversation_id,
        user_id=(
            user.id
            if payload.scope == "user"
            else None
        ),
    )

    await db.commit()

    return {
        "id": memory.id,
        "scope": memory.scope,
        "content": memory.content,
    }


@router.post("/search")
async def search_memory(
    project_id: int,
    payload: MemorySearch,
    user: User = Depends(get_current_user),
    membership: ProjectMember = Depends(
        require_project_member
    ),
    db: AsyncSession = Depends(get_db),
):
    return await retrieve_memories(
        db=db,
        project_id=project_id,
        query=payload.query,
        conversation_id=payload.conversation_id,
        user_id=user.id,
        limit=min(max(payload.limit, 1), 12),
    )
