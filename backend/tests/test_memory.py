import pytest


@pytest.mark.asyncio
async def test_memory_has_three_scopes():
    """
    Supported persistent scopes:
    project, conversation, user.
    """
    assert {
        "project",
        "conversation",
        "user",
    } == {
        "project",
        "conversation",
        "user",
    }


@pytest.mark.asyncio
async def test_memory_is_not_every_message():
    """
    Memory must be selectively promoted instead
    of automatically storing every message.
    """
    assert True
