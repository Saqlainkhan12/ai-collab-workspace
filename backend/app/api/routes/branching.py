from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.database import get_db
from app.models.core import User, ProjectMember
from app.models.chat import Conversation

from app.core.security import (
    get_current_user,
    require_project_member,
)

from app.services.branching import create_branch


router = APIRouter(
    prefix="/projects/{project_id}/conversations",
    tags=["Branching"],
)


class BranchCreate(BaseModel):
    title: str | None = None


@router.post("/{conversation_id}/branch")
async def branch_conversation(
    project_id: int,
    conversation_id: int,
    payload: BranchCreate,
    user: User = Depends(get_current_user),
    membership: ProjectMember = Depends(
        require_project_member
    ),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Conversation).where(
            Conversation.id == conversation_id,
            Conversation.project_id == project_id,
        )
    )

    parent = result.scalar_one_or_none()

    if not parent:
        raise HTTPException(
            status_code=404,
            detail="Conversation not found"
        )

    branch = await create_branch(
        db=db,
        parent_conversation_id=conversation_id,
        user_id=user.id,
        title=payload.title,
    )

    return {
        "branch_id": branch.id,
        "session_id": branch.session_id,
        "parent_conversation_id":
            branch.parent_conversation_id,
        "project_id": branch.project_id,
    }
