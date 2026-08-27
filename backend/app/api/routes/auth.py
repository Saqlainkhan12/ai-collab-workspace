from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.database import get_db
from app.models.core import User
from app.schemas.auth import UserCreate, UserResponse

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/register", response_model=UserResponse)
async def register(
    payload: UserCreate,
    db: AsyncSession = Depends(get_db),
):
    existing = await db.execute(
        select(User).where(User.email == payload.email)
    )

    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=409,
            detail="Email already registered"
        )

    user = User(
        name=payload.name,
        email=payload.email,
    )

    db.add(user)
    await db.commit()
    await db.refresh(user)

    return user


@router.get("/me", response_model=UserResponse)
async def me(
    user: User = Depends(__import__("app.core.security", fromlist=["get_current_user"]).get_current_user)
):
    return user
