"""Aplicação FastAPI principal."""
from __future__ import annotations

import logging
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from src_py.config import engine, settings
from src_py.database import Base
from src_py.database import models
from src_py.routes import router

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

static_path = Path(__file__).resolve().parent.parent / "public"
if static_path.exists():
    app.mount("/static", StaticFiles(directory=str(static_path)), name="static")


@app.on_event("startup")
async def startup_event() -> None:
    Base.metadata.create_all(bind=engine)
    logger.info("Database tables created/verified")
    logger.info("Application started: %s v%s", settings.PROJECT_NAME, settings.PROJECT_VERSION)


@app.on_event("shutdown")
async def shutdown_event() -> None:
    logger.info("Application shutdown")


@app.get("/")
async def root():
    return {"message": "Chatbot Empresas API", "version": settings.PROJECT_VERSION, "docs": "/docs", "health": f"{settings.API_V1_STR}/health"}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("src_py.main:app", host=settings.HOST, port=settings.PORT, reload=settings.RELOAD, log_level="info")
