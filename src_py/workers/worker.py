"""Processo worker RQ.

Execute localmente com:
    python -m src_py.workers.worker
"""
from __future__ import annotations

import logging

from rq import Worker

from src_py.config import settings
from src_py.workers.redis_connection import get_redis_connection

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)


def main() -> None:
    redis_conn = get_redis_connection()
    logger.info("Iniciando worker RQ na fila '%s'", settings.WORKER_QUEUE_NAME)
    worker = Worker([settings.WORKER_QUEUE_NAME], connection=redis_conn)
    worker.work(with_scheduler=False)


if __name__ == "__main__":
    main()
