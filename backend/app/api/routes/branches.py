from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.database import get_db
from app.models.core import ProjectMember
from app.models.chat import Conversation

from app.core.security import (
    require_project_member,
)


router = APIRouter(
    prefix="/projects/{project_id}/branches",
    tags=["Branches"],
)


@router.get("")
async def branch_tree(
    project_id: int,
    membership: ProjectMember = Depends(
        require_project_member
    ),
    db: AsyncSession = Depends(get_db),
):

    result = await db.execute(
        select(Conversation)
        .where(
            Conversation.project_id
            == project_id
        )
        .order_by(
            Conversation.created_at.asc()
        )
    )

    conversations = result.scalars().all()

    return [
        {
            "id": item.id,
            "session_id": item.session_id,
            "title": item.title,
            "parent_conversation_id":
                item.parent_conversation_id,
            "is_branch":
                item.parent_conversation_id
                is not None,
        }
        for item in conversations
    ]
