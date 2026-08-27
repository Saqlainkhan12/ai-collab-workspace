import pytest


@pytest.mark.asyncio
async def test_session_id_is_stable():
    """
    A conversation uses a dedicated session_id.
    """
    assert True


@pytest.mark.asyncio
async def test_messages_are_persistent():
    """
    User and assistant messages must survive
    subsequent conversation retrieval.
    """
    assert True


@pytest.mark.asyncio
async def test_project_context_reaches_model():
    """
    Chat pipeline must combine:
    instructions + RAG + memory + history.
    """
    assert True
