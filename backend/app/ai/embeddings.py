import httpx

from app.core.config import settings


OPENAI_EMBEDDING_MODEL = "text-embedding-3-small"
EMBEDDING_DIMENSIONS = 384


def embed_text(text: str) -> list[float]:
    vectors = embed_many([text])

    if not vectors:
        raise RuntimeError("Embedding API returned no vector")

    return vectors[0]


def embed_many(texts: list[str]) -> list[list[float]]:
    if not texts:
        return []

    if not settings.OPENAI_API_KEY:
        raise RuntimeError("OPENAI_API_KEY is not configured")

    payload = {
        "model": OPENAI_EMBEDDING_MODEL,
        "input": texts,
        "dimensions": EMBEDDING_DIMENSIONS,
    }

    headers = {
        "Authorization": f"Bearer {settings.OPENAI_API_KEY}",
        "Content-Type": "application/json",
    }

    with httpx.Client(timeout=120.0) as client:
        response = client.post(
            "https://api.openai.com/v1/embeddings",
            headers=headers,
            json=payload,
        )

    if response.status_code >= 400:
        raise RuntimeError(
            f"OpenAI embedding error {response.status_code}: {response.text[:1000]}"
        )

    data = response.json()

    items = data.get("data", [])

    if len(items) != len(texts):
        raise RuntimeError(
            f"Embedding count mismatch: expected {len(texts)}, got {len(items)}"
        )

    items.sort(key=lambda item: item.get("index", 0))

    vectors = [
        item.get("embedding")
        for item in items
    ]

    if any(vector is None for vector in vectors):
        raise RuntimeError("OpenAI returned an invalid embedding response")

    return vectors