from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.documents import DocumentChunk
from app.ai.embeddings import embed_text


async def retrieve(
    query: str,
    project_id: int,
    db: AsyncSession,
    limit: int = 6,
):
    query_vector = embed_text(query)

    distance = DocumentChunk.embedding.cosine_distance(
        query_vector
    )

    result = await db.execute(
        select(
            DocumentChunk,
            distance.label("distance")
        )
        .where(
            DocumentChunk.project_id == project_id
        )
        .order_by(distance)
        .limit(limit)
    )

    rows = result.all()

    return [
        {
            "chunk_id": chunk.id,
            "document_id": chunk.document_id,
            "content": chunk.content,
            "page_number": chunk.page_number,
            "section": chunk.section,
            "metadata": chunk.chunk_metadata,
            "score": round(
                max(0.0, 1.0 - float(distance_value)),
                4
            ),
        }
        for chunk, distance_value in rows
    ]


def build_context(chunks: list[dict]) -> str:
    if not chunks:
        return ""

    return "\n\n".join(
        (
            f"[Source {index + 1}] "
            f"Document ID: {chunk['document_id']} "
            f"Page: {chunk.get('page_number') or 'N/A'}\n"
            f"{chunk['content']}"
        )
        for index, chunk in enumerate(chunks)
    )
