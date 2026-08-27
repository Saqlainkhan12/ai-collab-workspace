import json

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.chat import Conversation, Message
from app.models.memory import Summary


def _clean(value):
    if isinstance(value, list):
        return value

    if value is None:
        return []

    return [str(value)]


async def generate_summary(
    db: AsyncSession,
    conversation_id: int,
    model,
):
    result = await db.execute(
        select(Message)
        .where(
            Message.conversation_id
            == conversation_id
        )
        .order_by(Message.created_at.asc())
    )

    messages = result.scalars().all()

    if not messages:
        return None

    transcript = "\n".join(
        f"{message.role.upper()}: {message.content}"
        for message in messages
    )

    prompt = f"""
Summarize this collaborative project conversation.

Return ONLY valid JSON with these keys:

objective
decisions
important_info
requirements
open_questions
next_steps

Each list field must be a JSON array.

CONVERSATION:

{transcript}
"""

    response = await model.ainvoke(
        [
            (
                "system",
                "You create concise structured conversation summaries."
            ),
            (
                "user",
                prompt
            ),
        ]
    )

    raw = (
        response.content
        if isinstance(response.content, str)
        else str(response.content)
    )

    try:
        data = json.loads(raw)
    except Exception:
        data = {
            "objective": raw,
            "decisions": [],
            "important_info": [],
            "requirements": [],
            "open_questions": [],
            "next_steps": [],
        }

    existing_result = await db.execute(
        select(Summary).where(
            Summary.conversation_id
            == conversation_id
        )
    )

    summary = existing_result.scalar_one_or_none()

    if not summary:
        summary = Summary(
            conversation_id=conversation_id
        )
        db.add(summary)

    summary.objective = str(
        data.get("objective", "")
    )

    summary.decisions = json.dumps(
        _clean(data.get("decisions"))
    )

    summary.important_info = json.dumps(
        _clean(data.get("important_info"))
    )

    summary.requirements = json.dumps(
        _clean(data.get("requirements"))
    )

    summary.open_questions = json.dumps(
        _clean(data.get("open_questions"))
    )

    summary.next_steps = json.dumps(
        _clean(data.get("next_steps"))
    )

    await db.commit()
    await db.refresh(summary)

    return summary
