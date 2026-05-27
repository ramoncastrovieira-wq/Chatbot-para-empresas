"""Conexão Redis/RQ para filas de background."""
from __future__ import annotations

from redis import Redis
from rq import Queue

from src_py.config import settings


def get_redis_connection() -> Redis:
    return Redis.from_url(settings.REDIS_URL, decode_responses=False)


def get_default_queue() -> Queue:
    return Queue(settings.WORKER_QUEUE_NAME, connection=get_redis_connection())
