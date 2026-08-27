from sqlalchemy import select

from app.models.chat import Message
from app.models.core import Project

from app.services.rag import (
    retrieve,
    build_context,
)

from app.services.memory import (
    retrieve_memories,
)

from app.ai.prompt import build_system_prompt
from app.ai.router import get_model_router


async def load_project_context(state, db):

    result = await db.execute(
        select(Project).where(
            Project.id == state["project_id"]
        )
    )

    project = result.scalar_one()

    state["project_instructions"] = (
        project.instructions or ""
    )

    return state


async def retrieve_project_knowledge(state, db):

    chunks = await retrieve(
        query=state["user_message"],
        project_id=state["project_id"],
        db=db,
        limit=6,
    )

    state["sources"] = chunks
    state["rag_context"] = build_context(chunks)

    return state


async def retrieve_project_memory(state, db):

    memories = await retrieve_memories(
        db=db,
        project_id=state["project_id"],
        query=state["user_message"],
        conversation_id=state.get(
            "conversation_id"
        ),
        user_id=state.get("user_id"),
        limit=6,
    )

    state["memories"] = memories

    return state


async def load_history(state, db):

    result = await db.execute(
        select(Message)
        .where(
            Message.conversation_id
            == state["conversation_id"]
        )
        .order_by(Message.created_at.asc())
    )

    messages = result.scalars().all()

    state["history"] = [
        {
            "role": message.role,
            "content": message.content,
        }
        for message in messages
    ]

    return state


async def generate_answer(state):

    memory_context = "\n\n".join(
        memory["content"]
        for memory in state.get(
            "memories",
            []
        )
    )

    rag_context = state.get(
        "rag_context",
        ""
    )

    if memory_context:
        rag_context += (
            "\n\nRELEVANT MEMORY:\n"
            + memory_context
        )

    system_prompt = build_system_prompt(
        project_name=f"Project {state['project_id']}",
        project_instructions=(
            state.get(
                "project_instructions",
                ""
            )
        ),
        rag_context=rag_context,
    )

    model = get_model_router().route(
        task_type="text",
        project_config={},
    )

    messages = [
        (
            "system",
            system_prompt
        )
    ]

    for item in state.get(
        "history",
        []
    ):
        messages.append(
            (
                item["role"],
                item["content"]
            )
        )

    messages.append(
        (
            "user",
            state["user_message"]
        )
    )

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

    state["answer"] = answer
    state["model"] = model.model_name

    return state
