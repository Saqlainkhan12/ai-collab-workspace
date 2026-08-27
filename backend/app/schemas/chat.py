from pydantic import BaseModel, Field


class ChatRequest(BaseModel):
    message: str = Field(min_length=1, max_length=20000)
    session_id: str | None = None
    title: str | None = None


class ChatResponse(BaseModel):
    conversation_id: int
    session_id: str
    answer: str
    model: str
    sources: list[dict]
