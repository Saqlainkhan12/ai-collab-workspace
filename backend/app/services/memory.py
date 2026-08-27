from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.memory import Memory
from app.ai.embeddings import embed_text


VALID_SCOPES = {
    "project",
    "conversation",
    "user",
}


async def save_memory(
    db: AsyncSession,
    project_id: int,
    content: str,
    scope: str,
    conversation_id: int | None = None,
    user_id: int | None = None,
):
    if scope not in VALID_SCOPES:
        raise ValueError("Invalid memory scope")

    if scope == "conversation" and not conversation_id:
        raise ValueError(
            "Conversation memory requires conversation_id"
        )

    if scope == "user" and not user_id:
        raise ValueError(
            "User memory requires user_id"
        )

    memory = Memory(
        project_id=project_id,
        scope=scope,
        conversation_id=conversation_id,
        user_id=user_id,
        content=content,
        embedding=embed_text(content),
    )

    db.add(memory)
    await db.flush()

    return memory


async def retrieve_memories(
    db: AsyncSession,
    project_id: int,
    query: str,
    conversation_id: int | None = None,
    user_id: int | None = None,
    limit: int = 6,
):
    vector = embed_text(query)

    conditions = [
        Memory.project_id == project_id
    ]

    from sqlalchemy import or_

    conditions.append(
        or_(
            Memory.scope == "project",

            (
                (Memory.scope == "conversation")
                &
                (
                    Memory.conversation_id
                    == conversation_id
                )
            )
            if conversation_id
            else False,

            (
                (Memory.scope == "user")
                &
                (
                    Memory.user_id
                    == user_id
                )
            )
            if user_id
            else False,
        )
    )

    distance = Memory.embedding.cosine_distance(
        vector
    )

    result = await db.execute(
        select(
            Memory,
            distance.label("distance")
        )
        .where(*conditions)
        .order_by(distance)
        .limit(limit)
    )

    rows = result.all()

    return [
        {
            "id": memory.id,
            "scope": memory.scope,
            "content": memory.content,
            "score": round(
                max(
                    0.0,
                    1.0 - float(distance_value)
                ),
                4
            ),
        }
        for memory, distance_value in rows
    ]
