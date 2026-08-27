from pydantic import BaseModel

class ProjectCreate(BaseModel):
    name: str
    description: str | None = None
    icon: str | None = None
    theme: str | None = None
    instructions: str = ""


class ProjectUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    icon: str | None = None
    theme: str | None = None
    instructions: str | None = None


class ProjectResponse(BaseModel):
    id: int
    name: str
    description: str | None
    icon: str | None
    theme: str | None
    instructions: str
    owner_id: int
