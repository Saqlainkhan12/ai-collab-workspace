from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel

from app.db.database import get_db
from app.models.core import Project, ProjectMember
from app.core.security import require_project_member

router = APIRouter(
    prefix="/projects/{project_id}/instructions",
    tags=["Project Instructions"],
)


class InstructionUpdate(BaseModel):
    instructions: str


@router.get("")
async def get_instructions(
    project_id: int,
    membership: ProjectMember = Depends(require_project_member),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Project).where(Project.id == project_id)
    )

    project = result.scalar_one_or_none()

    if not project:
        raise HTTPException(
            status_code=404,
            detail="Project not found"
        )

    return {
        "project_id": project_id,
        "instructions": project.instructions,
    }


@router.put("")
async def update_instructions(
    project_id: int,
    payload: InstructionUpdate,
    membership: ProjectMember = Depends(require_project_member),
    db: AsyncSession = Depends(get_db),
):
    if membership.role != "owner":
        raise HTTPException(
            status_code=403,
            detail="Project owner permission required"
        )

    result = await db.execute(
        select(Project).where(Project.id == project_id)
    )

    project = result.scalar_one_or_none()

    if not project:
        raise HTTPException(
            status_code=404,
            detail="Project not found"
        )

    project.instructions = payload.instructions

    await db.commit()

    return {
        "status": "updated",
        "project_id": project_id,
    }
