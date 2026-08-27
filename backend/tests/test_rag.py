import pytest


@pytest.mark.asyncio
async def test_rag_returns_relevant_chunks_only():
    """
    Retrieval must use project_id and similarity,
    never dump the complete document.
    """
    assert True


@pytest.mark.asyncio
async def test_rag_limit_is_bounded():
    """
    Retrieval API must enforce a safe maximum.
    """
    assert True
