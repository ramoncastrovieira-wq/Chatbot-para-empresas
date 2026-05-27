"""Funções utilitárias para enfileirar e consultar jobs."""
from __future__ import annotations

from typing import Any

from rq.job import Job

from src_py.workers.redis_connection import get_default_queue, get_redis_connection
from src_py.workers.tasks import process_incoming_message_task


def enqueue_incoming_message(
    conversation_id: int,
    contact_id: int,
    content: str,
    external_id: str | None = None,
) -> str:
    queue = get_default_queue()
    job = queue.enqueue(
        process_incoming_message_task,
        conversation_id,
        contact_id,
        content,
        external_id,
        job_timeout=120,
        result_ttl=3600,
        failure_ttl=86400,
    )
    return job.id


def get_job_status(job_id: str) -> dict[str, Any]:
    job = Job.fetch(job_id, connection=get_redis_connection())
    return {
        "job_id": job.id,
        "status": job.get_status(),
        "result": job.result,
        "error": str(job.exc_info) if job.exc_info else None,
    }
