"""Aplicação FastAPI principal."""
from __future__ import annotations

import logging
from pathlib import Path

from fastapi import FastAPI
from sqlalchemy import inspect, text
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

from src_py.config import engine, settings
from src_py.database import Base
from src_py.database import models
from src_py.routes import router
from src_py.demo_chatbot import seed_default_queues, cleanup_removed_queues
from src_py.config.database import SessionLocal
try:
    from src_py.integrations_whatsapp import whatsapp_router
except Exception:  # pragma: no cover
    whatsapp_router = None

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.PROJECT_VERSION,
    description="HUB de atendimento WhatsApp com FastAPI, PostgreSQL e base para IA.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.BACKEND_CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)
if whatsapp_router is not None:
    app.include_router(whatsapp_router)

static_path = Path(__file__).resolve().parent.parent / "public"
if static_path.exists():
    app.mount("/static", StaticFiles(directory=str(static_path)), name="static")


def _ensure_runtime_columns() -> None:
    """Adiciona colunas simples quando o banco já existia antes desta versão.

    O create_all cria tabelas novas, mas não altera tabelas antigas. Esta rotina
    mantém o projeto executável em ambientes locais já inicializados.
    """
    inspector = inspect(engine)
    if "conversations" not in inspector.get_table_names():
        return
    columns = {column["name"] for column in inspector.get_columns("conversations")}
    if "queue_id" in columns:
        return
    dialect = engine.dialect.name
    ddl = "ALTER TABLE conversations ADD COLUMN queue_id INTEGER"
    if dialect == "postgresql":
        ddl = "ALTER TABLE conversations ADD COLUMN IF NOT EXISTS queue_id INTEGER"
    with engine.begin() as conn:
        conn.execute(text(ddl))


def _seed_operational_data() -> None:
    db = SessionLocal()
    try:
        seed_default_queues(db)
        removed = cleanup_removed_queues(db)
        if removed:
            logger.info("Inactive removed queues: %s", removed)
    finally:
        db.close()


@app.on_event("startup")
async def startup_event() -> None:
    Base.metadata.create_all(bind=engine)
    _ensure_runtime_columns()
    _seed_operational_data()
    logger.info("Database tables created/verified and operational queues seeded")
    logger.info("Application started: %s v%s", settings.PROJECT_NAME, settings.PROJECT_VERSION)


@app.on_event("shutdown")
async def shutdown_event() -> None:
    logger.info("Application shutdown")


@app.get("/")
async def root():
    index_file = static_path / "index.html"
    if index_file.exists():
        return FileResponse(str(index_file))
    return {"message": "Chatbot Empresas API", "version": settings.PROJECT_VERSION, "docs": "/docs", "health": f"{settings.API_V1_STR}/health"}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("src_py.main:app", host=settings.HOST, port=settings.PORT, reload=settings.RELOAD, log_level="info")
