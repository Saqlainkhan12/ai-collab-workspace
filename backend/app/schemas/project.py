from pydantic import BaseModel, ConfigDict

class ProjectCreate(BaseModel):
    name: str
    description: str | None = None
    icon: str | None = "✦"
    theme: str | None = "dark"
    instructions: str | None = ""


class ProjectUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    icon: str | None = None
    theme: str | None = None
    instructions: str | None = None


class ProjectResponse(BaseModel):
    id: int
    name: str
    description: str | None = None
    icon: str | None = None
    theme: str | None = None
    instructions: str | None = ""
    owner_id: int

    model_config = ConfigDict(from_attributes=True)

