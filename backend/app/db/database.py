from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import DeclarativeBase
from app.core.config import settings

database_url = settings.DATABASE_URL

if database_url.startswith("postgresql://"):
    database_url = database_url.replace(
        "postgresql://",
        "postgresql+asyncpg://",
        1
    )

if database_url.startswith("postgres://"):
    database_url = database_url.replace(
        "postgres://",
        "postgresql+asyncpg://",
        1
    )

# asyncpg uses "ssl", not "sslmode", and does not need
# the PostgreSQL channel_binding query parameter here.
database_url = database_url.replace(
    "sslmode=require",
    "ssl=require"
)
database_url = database_url.replace(
    "&channel_binding=require",
    ""
)
database_url = database_url.replace(
    "?channel_binding=require&",
    "?"
)
database_url = database_url.replace(
    "?channel_binding=require",
    ""
)

engine = create_async_engine(
    database_url,
    pool_pre_ping=True,
)

AsyncSessionLocal = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


class Base(DeclarativeBase):
    pass


async def get_db():
    async with AsyncSessionLocal() as session:
        yield session
