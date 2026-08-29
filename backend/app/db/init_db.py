from sqlalchemy import text

from app.db.database import engine, Base
from app.models import *


async def init_db():
    async with engine.begin() as conn:

        await conn.execute(
            text("CREATE EXTENSION IF NOT EXISTS vector")
        )

        await conn.run_sync(
            Base.metadata.create_all
        )

    from app.db.database import AsyncSessionLocal
    from app.models.core import User
    from sqlalchemy import select

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
