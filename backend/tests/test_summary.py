import pytest


@pytest.mark.asyncio
async def test_summary_contains_required_fields():
    required = {
        "objective",
        "decisions",
        "important_info",
        "requirements",
        "open_questions",
        "next_steps",
    }

    assert len(required) == 6
