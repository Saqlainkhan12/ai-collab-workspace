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
