from pydantic import BaseModel, EmailStr, ConfigDict

class UserCreate(BaseModel):
    name: str
    email: EmailStr


class UserResponse(BaseModel):
    id: int
    name: str
    email: EmailStr

    model_config = ConfigDict(from_attributes=True)


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

    model_config = ConfigDict(from_attributes=True)
