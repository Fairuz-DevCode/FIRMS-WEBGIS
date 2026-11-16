import os
from sqlalchemy import create_engine
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import declarative_base

# Resolusi URL database dari environment
DATABASE_URL = os.getenv(
    "DATABASE_URL", 
    "postgresql+psycopg2://firms_user:firms_password@db:5432/firms_db"
)
ASYNC_DATABASE_URL = os.getenv(
    "ASYNC_DATABASE_URL", 
    "postgresql+asyncpg://firms_user:firms_password@db:5432/firms_db"
)

# Engine asynchronous untuk FastAPI & PostGIS queries
async_engine = create_async_engine(
    ASYNC_DATABASE_URL,
    echo=False,
    future=True,
    pool_size=20,
    max_overflow=10
)

AsyncSessionLocal = async_sessionmaker(
    bind=async_engine,
    class_=AsyncSession,
    expire_on_commit=False
)

# Engine synchronous untuk operasi batch / psycopg2
sync_engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True
)

Base = declarative_base()

async def get_db():
    """Dependency session database asynchronous untuk route FastAPI."""
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()
