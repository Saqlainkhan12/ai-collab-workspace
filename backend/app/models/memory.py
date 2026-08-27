from sqlalchemy import String, Text, DateTime, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.sql import func
from pgvector.sqlalchemy import Vector

from app.db.database import Base


class Memory(Base):
    __tablename__ = "memory"

    id: Mapped[int] = mapped_column(primary_key=True)

    project_id: Mapped[int] = mapped_column(
        ForeignKey("projects.id", ondelete="CASCADE"),
        index=True
    )

    scope: Mapped[str] = mapped_column(
        String(30),
        index=True
    )

    conversation_id: Mapped[int | None] = mapped_column(
        ForeignKey("conversations.id", ondelete="CASCADE"),
        nullable=True,
        index=True
    )

    user_id: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=True,
        index=True
    )

    content: Mapped[str] = mapped_column(Text())

    embedding: Mapped[list[float] | None] = mapped_column(
        Vector(384),
        nullable=True
    )

    created_at: Mapped[DateTime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now()
    )

    updated_at: Mapped[DateTime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now()
    )


class Summary(Base):
    __tablename__ = "summaries"

    id: Mapped[int] = mapped_column(primary_key=True)

    conversation_id: Mapped[int] = mapped_column(
        ForeignKey("conversations.id", ondelete="CASCADE"),
        unique=True
    )

    objective: Mapped[str] = mapped_column(
        Text(),
        default=""
    )

    decisions: Mapped[str] = mapped_column(
        Text(),
        default="[]"
    )

    important_info: Mapped[str] = mapped_column(
        Text(),
        default="[]"
    )

    requirements: Mapped[str] = mapped_column(
        Text(),
        default="[]"
    )

    open_questions: Mapped[str] = mapped_column(
        Text(),
        default="[]"
    )

    next_steps: Mapped[str] = mapped_column(
        Text(),
        default="[]"
    )

    created_at: Mapped[DateTime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now()
    )
