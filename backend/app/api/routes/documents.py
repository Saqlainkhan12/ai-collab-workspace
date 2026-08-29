from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.database import get_db
from app.models.core import User, ProjectMember
from app.models.documents import Document, DocumentChunk

from app.core.security import (
    get_current_user,
    require_project_member,
)

from app.services.documents import (
    save_document,
    extract_text,
    chunk_text,
)

from app.ai.embeddings import embed_many


router = APIRouter(
    prefix="/projects/{project_id}/documents",
    tags=["Documents"],
)


@router.get("")
async def list_documents(
    project_id: int,
    membership: ProjectMember = Depends(
        require_project_member
    ),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Document)
        .where(
            Document.project_id == project_id
        )
        .order_by(Document.created_at.desc())
    )

    documents = result.scalars().all()

    return [
        {
            "id": document.id,
            "filename": document.filename,
            "file_type": document.file_type,
            "status": document.status,
            "error": document.error_message,
            "created_at": document.created_at,
        }
        for document in documents
    ]


@router.post("/upload")
async def upload_document(
    project_id: int,
    file: UploadFile = File(...),
    user: User = Depends(get_current_user),
    membership: ProjectMember = Depends(
        require_project_member
    ),
    db: AsyncSession = Depends(get_db),
):
    if not file.filename:
        raise HTTPException(
            status_code=400,
            detail="Filename is required"
        )

    content = await file.read()

    document: Document | None = None

    try:
        file_path = save_document(
            project_id,
            file.filename,
            content
        )

        document = Document(
            project_id=project_id,
            filename=file.filename,
            file_type=file.content_type or "unknown",
            file_path=file_path,
            uploaded_by=user.id,
            status="processing",
        )

        db.add(document)
        await db.flush()

        text = extract_text(file_path)
        chunks = chunk_text(text)

        if not chunks:
            raise ValueError(
                "No readable text found in document"
            )

        embeddings = embed_many(chunks)

        for index, (chunk, vector) in enumerate(
            zip(chunks, embeddings)
        ):
            db.add(
                DocumentChunk(
                    document_id=document.id,
                    project_id=project_id,
                    chunk_index=index,
                    content=chunk,
                    embedding=vector,
                    chunk_metadata={
                        "filename": file.filename,
                        "content_type": file.content_type,
                    },
                )
            )

        document.status = "indexed"

        await db.commit()
        await db.refresh(document)

        return {
            "id": document.id,
            "filename": document.filename,
            "status": document.status,
            "chunks": len(chunks),
        }

    except Exception as exc:
        await db.rollback()

        if document is not None:
            document.status = "failed"
            document.error_message = str(exc)[:1000]

            db.add(document)
            await db.commit()

        raise HTTPException(
            status_code=400,
            detail=f"Document processing failed: {exc}"
        )
