from sqlalchemy import text, select
import logging

from app.db.database import engine, Base, AsyncSessionLocal
from app.models import *
from app.models.core import User

logger = logging.getLogger(__name__)


async def init_db():
    try:
        async with engine.begin() as conn:
            try:
                await conn.execute(
                    text("CREATE EXTENSION IF NOT EXISTS vector")
                )
            except Exception as e:
                logger.warning(f"pgvector extension notice: {e}")

            await conn.run_sync(
                Base.metadata.create_all
            )

        async with AsyncSessionLocal() as session:
            result = await session.execute(
                select(User).limit(1)
            )
            if not result.scalar_one_or_none():
                default_user = User(
                    name="Saqlain",
                    email="saqlain@workspace.ai",
                )
                session.add(default_user)
                await session.commit()
    except Exception as exc:
        logger.error(f"Error during init_db: {exc}")

