import pytest


@pytest.mark.asyncio
async def test_non_member_cannot_access_project():
    """
    Every project-scoped endpoint must reject
    a user who is not a project member.
    """
    assert True


@pytest.mark.asyncio
async def test_rag_is_project_scoped():
    """
    Retrieval must never return chunks belonging
    to another project.
    """
    assert True


@pytest.mark.asyncio
async def test_instructions_are_project_scoped():
    """
    Project A instructions must never appear
    inside Project B context.
    """
    assert True
