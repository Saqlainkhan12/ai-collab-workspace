from typing import TypedDict, Annotated
from operator import add


class WorkspaceState(TypedDict, total=False):
    project_id: int
    conversation_id: int
    session_id: str
    user_id: int

    user_message: str
    project_instructions: str

    rag_context: str
    memories: list[dict]

    history: list[dict]
    answer: str

    model: str
    sources: list[dict]
