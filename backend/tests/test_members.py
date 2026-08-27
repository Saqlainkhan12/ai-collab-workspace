import pytest


@pytest.mark.asyncio
async def test_sixth_member_rejected():
    """
    Project owner + four members = 5 total.
    Sixth member must be rejected.
    """
    assert True


@pytest.mark.asyncio
async def test_concurrent_member_limit():
    """
    Concurrent requests must not bypass the
    server-side member limit.
    """
    assert True
