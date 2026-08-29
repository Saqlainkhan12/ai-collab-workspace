from pydantic import BaseModel, EmailStr, ConfigDict

class MemberAdd(BaseModel):
    email: EmailStr
    role: str = "member"


class MemberUpdate(BaseModel):
    role: str


class MemberResponse(BaseModel):
    id: int
    user_id: int
    name: str
    email: str
    role: str

    model_config = ConfigDict(from_attributes=True)

