from sqlalchemy import String, Text, DateTime, ForeignKey, JSON
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.sql import func

from app.db.database import Base


class Conversation(Base):
    __tablename__ = "conversations"

    id: Mapped[int] = mapped_column(primary_key=True)

    project_id: Mapped[int] = mapped_column(
        ForeignKey("projects.id", ondelete="CASCADE"),
        index=True
    )

    owner_id: Mapped[int] = mapped_column(
        ForeignKey("users.id")
    )

    session_id: Mapped[str] = mapped_column(
        String(200),
        unique=True,
        index=True
    )

    title: Mapped[str] = mapped_column(
        String(300),
        default="New conversation"
    )

    parent_conversation_id: Mapped[int | None] = mapped_column(
        ForeignKey("conversations.id"),
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


class Message(Base):
    __tablename__ = "messages"

    id: Mapped[int] = mapped_column(primary_key=True)

    conversation_id: Mapped[int] = mapped_column(
        ForeignKey("conversations.id", ondelete="CASCADE"),
        index=True
    )

    sender_id: Mapped[int | None] = mapped_column(
        ForeignKey("users.id"),
        nullable=True
    )

    role: Mapped[str] = mapped_column(
        String(30)
    )

    content: Mapped[str] = mapped_column(
        Text()
    )

    model_used: Mapped[str | None] = mapped_column(
        String(200),
        nullable=True
    )

    attachments: Mapped[list | None] = mapped_column(
        JSON,
        nullable=True
    )

    tool_calls: Mapped[list | None] = mapped_column(
        JSON,
        nullable=True
    )

    created_at: Mapped[DateTime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now()
    )
