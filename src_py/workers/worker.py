"""Processo worker RQ.

Execute localmente com:
    python -m src_py.workers.worker

No Windows, este arquivo usa SimpleWorker automaticamente para evitar os recursos
Unix fork/SIGALRM que não existem no PowerShell nativo.
"""
from __future__ import annotations

import logging
import os

from rq import SimpleWorker, Worker

from src_py.config import settings
from src_py.workers.redis_connection import get_redis_connection

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)


def main() -> None:
    redis_conn = get_redis_connection()
    worker_cls = SimpleWorker if os.name == "nt" else Worker
    logger.info("Iniciando worker RQ na fila '%s' com %s", settings.WORKER_QUEUE_NAME, worker_cls.__name__)
    worker = worker_cls([settings.WORKER_QUEUE_NAME], connection=redis_conn)
    worker.work(with_scheduler=False)


if __name__ == "__main__":
    main()
