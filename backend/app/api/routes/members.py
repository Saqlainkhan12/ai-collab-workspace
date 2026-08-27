from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.database import get_db
from app.models.core import User, ProjectMember, Project
from app.schemas.member import MemberAdd, MemberUpdate, MemberResponse
from app.core.security import (
    get_current_user,
    require_project_member,
    require_project_owner,
)

router = APIRouter(
    prefix="/projects/{project_id}/members",
    tags=["Project Members"],
)


@router.get("", response_model=list[MemberResponse])
async def list_members(
    project_id: int,
    membership: ProjectMember = Depends(require_project_member),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(ProjectMember, User)
        .join(User, User.id == ProjectMember.user_id)
        .where(ProjectMember.project_id == project_id)
        .order_by(ProjectMember.joined_at.asc())
    )

    rows = result.all()

    return [
        MemberResponse(
            id=member.id,
            user_id=user.id,
            name=user.name,
            email=user.email,
            role=member.role,
        )
        for member, user in rows
    ]


@router.post("", response_model=MemberResponse)
async def add_member(
    project_id: int,
    payload: MemberAdd,
    membership: ProjectMember = Depends(require_project_owner),
    db: AsyncSession = Depends(get_db),
):
    # Verify project exists
    project_result = await db.execute(
        select(Project).where(Project.id == project_id)
    )

    project = project_result.scalar_one_or_none()

    if not project:
        raise HTTPException(
            status_code=404,
            detail="Project not found"
        )

    # Find user by email
    user_result = await db.execute(
        select(User).where(User.email == payload.email)
    )

    user = user_result.scalar_one_or_none()

    if not user:
        raise HTTPException(
            status_code=404,
            detail="User with this email does not exist"
        )

    # Prevent duplicate membership
    existing_result = await db.execute(
        select(ProjectMember).where(
            ProjectMember.project_id == project_id,
            ProjectMember.user_id == user.id,
        )
    )

    if existing_result.scalar_one_or_none():
        raise HTTPException(
            status_code=409,
            detail="User is already a project member"
        )

    role = payload.role.lower()

    if role not in ("member", "owner"):
        raise HTTPException(
            status_code=400,
            detail="Role must be member or owner"
        )

    # IMPORTANT:
    # No 5-member limit.
    # 5, 10, 20+ members are allowed.
    new_member = ProjectMember(
        project_id=project_id,
        user_id=user.id,
        role="member" if role == "owner" else role,
    )

    db.add(new_member)
    await db.commit()
    await db.refresh(new_member)

    return MemberResponse(
        id=new_member.id,
        user_id=user.id,
        name=user.name,
        email=user.email,
        role=new_member.role,
    )


@router.patch("/{user_id}", response_model=MemberResponse)
async def update_member(
    project_id: int,
    user_id: int,
    payload: MemberUpdate,
    membership: ProjectMember = Depends(require_project_owner),
    db: AsyncSession = Depends(get_db),
):
    if payload.role not in ("member", "owner"):
        raise HTTPException(
            status_code=400,
            detail="Role must be member or owner"
        )

    result = await db.execute(
        select(ProjectMember, User)
        .join(User, User.id == ProjectMember.user_id)
        .where(
            ProjectMember.project_id == project_id,
            ProjectMember.user_id == user_id,
        )
    )

    row = result.first()

    if not row:
        raise HTTPException(
            status_code=404,
            detail="Project member not found"
        )

    member, user = row

    member.role = payload.role

    await db.commit()
    await db.refresh(member)

    return MemberResponse(
        id=member.id,
        user_id=user.id,
        name=user.name,
        email=user.email,
        role=member.role,
    )


@router.delete("/{user_id}")
async def remove_member(
    project_id: int,
    user_id: int,
    current_user: User = Depends(get_current_user),
    membership: ProjectMember = Depends(require_project_owner),
    db: AsyncSession = Depends(get_db),
):
    if user_id == current_user.id:
        raise HTTPException(
            status_code=400,
            detail="Project owner cannot remove themselves"
        )

    result = await db.execute(
        select(ProjectMember).where(
            ProjectMember.project_id == project_id,
            ProjectMember.user_id == user_id,
        )
    )

    member = result.scalar_one_or_none()

    if not member:
        raise HTTPException(
            status_code=404,
            detail="Project member not found"
        )

    await db.delete(member)
    await db.commit()

    return {
        "status": "removed",
        "project_id": project_id,
        "user_id": user_id,
    }
