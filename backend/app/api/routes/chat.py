import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.database import get_db
from app.models.core import User, ProjectMember, Project
from app.models.chat import Conversation, Message

from app.schemas.chat import ChatRequest, ChatResponse

from app.core.security import (
    get_current_user,
    require_project_member,
)

from app.services.rag import (
    retrieve,
    build_context,
)

from app.ai.router import get_model_router
from app.ai.prompt import build_system_prompt


router = APIRouter(
    prefix="/projects/{project_id}/chat",
    tags=["Chat"],
)


async def get_or_create_conversation(
    project_id: int,
    user: User,
    payload: ChatRequest,
    db: AsyncSession,
):

    if payload.session_id:

        result = await db.execute(
            select(Conversation).where(
                Conversation.session_id
                == payload.session_id,
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

        return conversation

    session_id = str(uuid.uuid4())

    conversation = Conversation(
        project_id=project_id,
        owner_id=user.id,
        session_id=session_id,
        title=(
            payload.title
            or payload.message[:80]
        ),
    )

    db.add(conversation)
    await db.flush()

    return conversation


async def get_recent_messages(
    conversation_id: int,
    db: AsyncSession,
    limit: int = 20,
):
    result = await db.execute(
        select(Message)
        .where(
            Message.conversation_id
            == conversation_id
        )
        .order_by(Message.created_at.desc())
        .limit(limit)
    )

    messages = list(
        reversed(result.scalars().all())
    )

    return messages


@router.post(
    "",
    response_model=ChatResponse
)
async def chat(
    project_id: int,
    payload: ChatRequest,
    user: User = Depends(get_current_user),
    membership: ProjectMember = Depends(
        require_project_member
    ),
    db: AsyncSession = Depends(get_db),
):

    project_result = await db.execute(
        select(Project).where(
            Project.id == project_id
        )
    )

    project = project_result.scalar_one_or_none()

    if not project:
        raise HTTPException(
            status_code=404,
            detail="Project not found"
        )

    conversation = (
        await get_or_create_conversation(
            project_id=project_id,
            user=user,
            payload=payload,
            db=db,
        )
    )

    history = await get_recent_messages(
        conversation.id,
        db,
        limit=20,
    )

    user_message = Message(
        conversation_id=conversation.id,
        sender_id=user.id,
        role="user",
        content=payload.message,
    )

    db.add(user_message)
    await db.flush()

    rag_chunks = await retrieve(
        query=payload.message,
        project_id=project_id,
        db=db,
        limit=6,
    )

    rag_context = build_context(
        rag_chunks
    )

    system_prompt = build_system_prompt(
        project_name=project.name,
        project_instructions=project.instructions,
        rag_context=rag_context,
    )

    model = get_model_router().route(
        task_type="text",
        project_config={},
    )

    messages = [
        (
            "system",
            system_prompt,
        )
    ]

    for item in history:
        messages.append(
            (
                item.role,
                item.content,
            )
        )

    messages.append(
        (
            "user",
            payload.message,
        )
    )

    try:
        response = await model.ainvoke(
            messages
        )

        answer = (
            response.content
            if isinstance(
                response.content,
                str
            )
            else str(response.content)
        )

    except Exception as exc:
        await db.rollback()

        raise HTTPException(
            status_code=502,
            detail=f"AI model request failed: {exc}"
        )

    assistant_message = Message(
        conversation_id=conversation.id,
        sender_id=None,
        role="assistant",
        content=answer,
        model_used=model.model_name,
    )

    db.add(assistant_message)

    await db.commit()

    return ChatResponse(
        conversation_id=conversation.id,
        session_id=conversation.session_id,
        answer=answer,
        model=model.model_name,
        sources=rag_chunks,
    )
