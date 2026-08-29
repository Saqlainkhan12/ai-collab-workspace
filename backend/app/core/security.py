from fastapi import Depends, HTTPException, Header
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.database import get_db
from app.models.core import User, ProjectMember

async def get_current_user(
    x_user_id: str | int | None = Header(default=1),
    db: AsyncSession = Depends(get_db),
):
    try:
        user_id = int(x_user_id) if x_user_id is not None else 1
    except (ValueError, TypeError):
        user_id = 1

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()

    if not user:
        first_user_res = await db.execute(
            select(User).order_by(User.id.asc()).limit(1)
        )
        first_user = first_user_res.scalar_one_or_none()

        if first_user:
            return first_user

        default_user = User(
            name="Saqlain",
            email="saqlain@workspace.ai",
        )
        db.add(default_user)
        await db.commit()
        await db.refresh(default_user)
        return default_user

    return user



async def require_project_member(
    project_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(ProjectMember).where(
            ProjectMember.project_id == project_id,
            ProjectMember.user_id == user.id,
        )
    )

    membership = result.scalar_one_or_none()

    if not membership:
        raise HTTPException(
            status_code=403,
            detail="You are not a member of this project"
        )

    return membership


async def require_project_owner(
    project_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(ProjectMember).where(
            ProjectMember.project_id == project_id,
            ProjectMember.user_id == user.id,
            ProjectMember.role == "owner",
        )
    )

    membership = result.scalar_one_or_none()

    if not membership:
        raise HTTPException(
            status_code=403,
            detail="Project owner permission required"
        )

    return membership
