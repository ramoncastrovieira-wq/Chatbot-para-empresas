"""Tarefas executadas pelos workers.

Neste MVP, o worker tira do processo HTTP as tarefas lentas, como:
- processar mensagem recebida;
- gerar resposta operacional/IA;
- salvar resposta do bot;
- no futuro: chamar WhatsApp Cloud API, Chatwoot, n8n e webhooks.
"""
from __future__ import annotations

import asyncio
import logging
from typing import Any

from src_py.config import get_db_context
from src_py.services import get_conversation_service, get_message_service

logger = logging.getLogger(__name__)


def process_incoming_message_task(
    conversation_id: int,
    contact_id: int,
    content: str,
    external_id: str | None = None,
) -> dict[str, Any]:
    """Processa uma mensagem de entrada fora da requisição HTTP."""
    logger.info("Worker processando mensagem: conversation_id=%s contact_id=%s", conversation_id, contact_id)

    with get_db_context() as db:
        conversation = get_conversation_service(db).get_conversation(conversation_id)
        if not conversation:
            raise ValueError(f"Conversation {conversation_id} not found")

        if conversation.contact_id != contact_id:
            raise ValueError("contact_id does not match conversation.contact_id")

        service = get_message_service(db)
        response_content = asyncio.run(
            service.process_incoming_message(
                conversation_id=conversation_id,
                contact_id=contact_id,
                content=content,
                external_id=external_id,
            )
        )
        db.commit()

        return {
            "conversation_id": conversation_id,
            "contact_id": contact_id,
            "response": response_content,
            "status": "completed",
        }
