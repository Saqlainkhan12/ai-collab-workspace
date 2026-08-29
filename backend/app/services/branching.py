from uuid import uuid4

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.chat import Conversation, Message


async def create_branch(
    db: AsyncSession,
    parent_conversation_id: int,
    user_id: int,
    title: str | None = None,
):
    result = await db.execute(
        select(Conversation).where(
            Conversation.id == parent_conversation_id
        )
    )

    parent = result.scalar_one_or_none()

    if not parent:
        raise ValueError(
            "Parent conversation not found"
        )

    branch = Conversation(
        project_id=parent.project_id,
        owner_id=user_id,
        session_id=str(uuid4()),
        title=title or f"Branch of {parent.title}",
        parent_conversation_id=parent.id,
    )

    db.add(branch)
    await db.flush()

    # Copy parent conversation messages into the branch.
    messages_result = await db.execute(
        select(Message)
        .where(
            Message.conversation_id == parent.id
        )
        .order_by(Message.created_at.asc(), Message.id.asc())
    )

    parent_messages = messages_result.scalars().all()

    for parent_message in parent_messages:
        branch_message = Message(
            conversation_id=branch.id,
            sender_id=parent_message.sender_id,
            role=parent_message.role,
            content=parent_message.content,
            model_used=parent_message.model_used,
        )

        db.add(branch_message)

    await db.commit()
    await db.refresh(branch)

    return branch


async def continue_branch(
    db: AsyncSession,
    branch_id: int,
    user_id: int,
    content: str,
):
    result = await db.execute(
        select(Conversation).where(
            Conversation.id == branch_id
        )
    )

    branch = result.scalar_one_or_none()

    if not branch:
        raise ValueError(
            "Branch conversation not found"
        )

    message = Message(
        conversation_id=branch.id,
        sender_id=user_id,
        role="user",
        content=content,
    )

    db.add(message)

    await db.commit()

    return branch
