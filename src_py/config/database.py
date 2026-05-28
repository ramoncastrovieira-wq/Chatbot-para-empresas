"""Configuração de conexão com banco de dados via SQLAlchemy."""
from __future__ import annotations

from contextlib import asynccontextmanager, contextmanager
from typing import AsyncGenerator, Generator

from sqlalchemy import create_engine, pool
from sqlalchemy.orm import Session, sessionmaker

from src_py.config.settings import settings


def _engine_kwargs() -> dict:
    if settings.DATABASE_URL.startswith("sqlite"):
        return {"connect_args": {"check_same_thread": False}, "echo": settings.ECHO_SQL}
    return {
        "echo": settings.ECHO_SQL,
        "poolclass": pool.QueuePool,
        "pool_size": 10,
        "max_overflow": 20,
        "pool_pre_ping": True,
    }


engine = create_engine(settings.DATABASE_URL, **_engine_kwargs())
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@contextmanager
def get_db_context() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


async def get_async_db() -> AsyncGenerator[Session, None]:
    raise RuntimeError("Sessões assíncronas ainda não estão habilitadas. Use get_db().")


@asynccontextmanager
async def get_async_db_context():
    raise RuntimeError("Contexto assíncrono ainda não está habilitado. Use get_db_context().")
