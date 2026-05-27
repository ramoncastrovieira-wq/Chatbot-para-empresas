"""Configurações da aplicação carregadas por variáveis de ambiente."""
from __future__ import annotations

from typing import Optional

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", case_sensitive=True, extra="ignore")

    PROJECT_NAME: str = "Chatbot Empresas - Python"
    PROJECT_VERSION: str = "2.0.1"
    API_V1_STR: str = "/api/v1"
    DEBUG: bool = False

    HOST: str = "0.0.0.0"
    PORT: int = 8000
    RELOAD: bool = True

    DATABASE_URL: str = "postgresql+psycopg://postgres:123@127.0.0.1:5433/chatbot"
    ECHO_SQL: bool = False

    REDIS_URL: str = "redis://127.0.0.1:6379/0"
    WORKER_QUEUE_NAME: str = "default"

    SECRET_KEY: str = "change-me-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30

    OPENAI_API_KEY: Optional[str] = None
    LLM_MODEL: str = "gpt-4o-mini"

    WHATSAPP_BUSINESS_ACCOUNT_ID: Optional[str] = None
    WHATSAPP_ACCESS_TOKEN: Optional[str] = None
    WHATSAPP_WEBHOOK_TOKEN: Optional[str] = None

    BACKEND_CORS_ORIGINS: list[str] = ["http://localhost:3000", "http://localhost:8000", "http://127.0.0.1:5500", "http://localhost:5500"]

    @field_validator("BACKEND_CORS_ORIGINS", mode="before")
    @classmethod
    def parse_cors_origins(cls, value):
        if isinstance(value, str):
            value = value.strip()
            if value.startswith("["):
                import json

                return json.loads(value)
            return [item.strip() for item in value.split(",") if item.strip()]
        return value


settings = Settings()
