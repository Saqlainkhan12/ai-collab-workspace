from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.database import get_db
from app.models.core import User, ProjectMember
from app.models.chat import Conversation, Message
from app.core.security import require_project_member


router = APIRouter(
    prefix="/projects/{project_id}/conversations",
    tags=["Conversations"],
)


@router.get("")
async def list_conversations(
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
            Conversation.updated_at.desc()
        )
    )

    conversations = result.scalars().all()

    return [
        {
            "id": item.id,
            "session_id": item.session_id,
            "title": item.title,
            "owner_id": item.owner_id,
            "parent_conversation_id":
                item.parent_conversation_id,
            "created_at": item.created_at,
            "updated_at": item.updated_at,
        }
        for item in conversations
    ]


@router.get("/{conversation_id}/messages")
async def conversation_messages(
    project_id: int,
    conversation_id: int,
    membership: ProjectMember = Depends(
        require_project_member
    ),
    db: AsyncSession = Depends(get_db),
):

    result = await db.execute(
        select(Conversation).where(
            Conversation.id
            == conversation_id,
            Conversation.project_id
            == project_id,
        )
    )

    conversation = result.scalar_one_or_none()

    if not conversation:
        raise HTTPException(
            status_code=404,
            detail="Conversation not found"
        )

    result = await db.execute(
        select(Message)
        .where(
            Message.conversation_id
            == conversation_id
        )
        .order_by(Message.created_at.asc())
    )

    messages = result.scalars().all()

    return {
        "conversation": {
            "id": conversation.id,
            "session_id": conversation.session_id,
            "title": conversation.title,
        },
        "messages": [
            {
                "id": message.id,
                "role": message.role,
                "content": message.content,
                "model_used":
                    message.model_used,
                "created_at":
                    message.created_at,
            }
            for message in messages
        ],
    }
