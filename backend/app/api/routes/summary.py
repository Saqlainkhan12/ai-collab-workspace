from fastapi import APIRouter, Depends, HTTPException

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.database import get_db
from app.models.core import ProjectMember
from app.models.chat import Conversation

from app.core.security import require_project_member
from app.ai.router import get_model_router
from app.services.summary import generate_summary


router = APIRouter(
    prefix="/projects/{project_id}/conversations",
    tags=["Summaries"],
)


@router.post("/{conversation_id}/summary")
async def summarize_conversation(
    project_id: int,
    conversation_id: int,
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

    conversation = result.scalar_one_or_none()

    if not conversation:
        raise HTTPException(
            status_code=404,
            detail="Conversation not found"
        )

    model = get_model_router().route(
        task_type="text",
        project_config={}
    )

    summary = await generate_summary(
        db=db,
        conversation_id=conversation_id,
        model=model,
    )

    if not summary:
        raise HTTPException(
            status_code=400,
            detail="Cannot summarize empty conversation",
        )

    return {
        "id": summary.id,
        "conversation_id":
            summary.conversation_id,
        "objective":
            summary.objective,
        "decisions":
            summary.decisions,
        "important_info":
            summary.important_info,
        "requirements":
            summary.requirements,
        "open_questions":
            summary.open_questions,
        "next_steps":
            summary.next_steps,
    }
