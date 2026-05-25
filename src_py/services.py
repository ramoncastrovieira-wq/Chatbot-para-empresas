"""Camada de serviços de negócio."""
from __future__ import annotations

import logging
from typing import Any, Optional

from sqlalchemy.orm import Session

from src_py.config import settings
from src_py.repositories import ContactRepository, ConversationRepository, MessageRepository, QueueItemRepository, QueueRepository, UserRepository

logger = logging.getLogger(__name__)


class UserService:
    def __init__(self, db: Session):
        self.repo = UserRepository(db)

    def create_user(self, username: str, password: str, email: str | None = None, role: str = "user"):
        return self.repo.create(username=username, email=email, password=password, role=role)

    def authenticate(self, username: str, password: str):
        from src_py.auth import verify_password

        user = self.repo.get_by_username(username)
        if user and verify_password(password, user.hashed_password):
            return user
        return None

    def get_user(self, user_id: int):
        return self.repo.get_by_id(user_id)

    def get_user_by_username(self, username: str):
        return self.repo.get_by_username(username)

    def list_users(self, skip: int = 0, limit: int = 100):
        return self.repo.list_all(skip, limit)


class ContactService:
    def __init__(self, db: Session):
        self.repo = ContactRepository(db)

    def create_contact(self, phone: str, name: str, email: str | None = None, metadata: dict[str, Any] | None = None):
        return self.repo.create(phone=phone, name=name, email=email, metadata=metadata)

    def get_or_create_contact(self, phone: str, name: str, email: str | None = None):
        return self.repo.get_or_create(phone=phone, name=name, email=email)

    def get_contact(self, contact_id: int):
        return self.repo.get_by_id(contact_id)

    def get_contact_by_phone(self, phone: str):
        return self.repo.get_by_phone(phone)

    def list_contacts(self, skip: int = 0, limit: int = 100):
        return self.repo.list_all(skip, limit)


class ConversationService:
    def __init__(self, db: Session):
        self.conversation_repo = ConversationRepository(db)
        self.message_repo = MessageRepository(db)
        self.contact_repo = ContactRepository(db)
        self.db = db

    def create_conversation(self, contact_id: int, title: str | None = None, metadata: dict[str, Any] | None = None):
        return self.conversation_repo.create(contact_id=contact_id, title=title, metadata=metadata)

    def get_or_create_conversation(self, contact_id: int, title: str | None = None):
        conversation = self.conversation_repo.get_active_by_contact(contact_id)
        return conversation or self.create_conversation(contact_id=contact_id, title=title)

    def get_conversation(self, conversation_id: int):
        return self.conversation_repo.get_by_id(conversation_id)

    def list_conversations(self, contact_id: int | None = None, status: str | None = None, skip: int = 0, limit: int = 100):
        if contact_id is not None:
            return self.conversation_repo.list_by_contact(contact_id, skip, limit)
        if status:
            return self.conversation_repo.list_by_status(status, skip, limit)
        return self.conversation_repo.list_all(skip, limit)

    def close_conversation(self, conversation_id: int):
        return self.conversation_repo.close(conversation_id)

    def assign_to_attendant(self, conversation_id: int, attendant_id: int):
        return self.conversation_repo.update(conversation_id, assigned_attendant_id=attendant_id)


class MessageService:
    def __init__(self, db: Session):
        self.message_repo = MessageRepository(db)
        self.conversation_repo = ConversationRepository(db)

    def create_message(
        self,
        conversation_id: int,
        contact_id: int,
        content: str,
        sender_type: str,
        message_type: str = "text",
        external_id: str | None = None,
        metadata: dict[str, Any] | None = None,
    ):
        return self.message_repo.create(
            conversation_id=conversation_id,
            contact_id=contact_id,
            content=content,
            sender_type=sender_type,
            message_type=message_type,
            external_id=external_id,
            metadata=metadata,
        )

    async def process_incoming_message(
        self,
        conversation_id: int,
        contact_id: int,
        content: str,
        external_id: str | None = None,
    ) -> str:
        self.create_message(conversation_id, contact_id, content, sender_type="user", external_id=external_id)

        response_content = await self._generate_response(conversation_id, content)

        self.create_message(conversation_id, contact_id, response_content, sender_type="bot")
        return response_content

    async def _generate_response(self, conversation_id: int, content: str) -> str:
        """Gera resposta com IA quando houver chave; senão devolve fallback operacional."""
        if not settings.OPENAI_API_KEY or settings.OPENAI_API_KEY.startswith("sk-test"):
            return (
                "Mensagem recebida. No momento a IA não está configurada neste ambiente; "
                "o atendimento pode ser encaminhado para um atendente humano."
            )

        try:
            from src_py.ai_flows import ConversationState, get_ai_manager

            messages = self.message_repo.list_by_conversation(conversation_id, limit=10)
            messages.reverse()
            conversation_history = [
                {
                    "role": "user" if msg.sender_type == "user" else "assistant",
                    "content": msg.content,
                }
                for msg in messages
            ]
            state = ConversationState(messages=conversation_history, conversation_id=conversation_id, contact_phone="", metadata={})
            result_state = await get_ai_manager().process_conversation(state)
            if result_state.messages:
                return result_state.messages[-1].get("content", "Não consegui gerar uma resposta.")
        except Exception as exc:
            logger.exception("Falha ao gerar resposta de IA: %s", exc)

        return "Recebemos sua mensagem. Um atendente dará continuidade ao atendimento."

    def get_conversation_history(self, conversation_id: int, limit: int = 50) -> list[dict[str, Any]]:
        messages = self.message_repo.list_by_conversation(conversation_id, limit)
        messages.reverse()
        return [
            {
                "id": msg.id,
                "conversation_id": msg.conversation_id,
                "contact_id": msg.contact_id,
                "sender_type": msg.sender_type,
                "content": msg.content,
                "message_type": msg.message_type,
                "external_id": msg.external_id,
                "metadata_": msg.metadata_ or {},
                "created_at": msg.created_at,
                "updated_at": msg.updated_at,
            }
            for msg in messages
        ]


class QueueService:
    def __init__(self, db: Session):
        self.queue_repo = QueueRepository(db)
        self.queue_item_repo = QueueItemRepository(db)
        self.conversation_repo = ConversationRepository(db)

    def create_queue(self, name: str, description: str | None = None, priority: int = 0):
        return self.queue_repo.create(name=name, description=description, priority=priority)

    def get_queue(self, queue_id: int):
        return self.queue_repo.get_by_id(queue_id)

    def get_queue_by_name(self, name: str):
        return self.queue_repo.get_by_name(name)

    def list_queues(self, skip: int = 0, limit: int = 100):
        return self.queue_repo.list_all(skip, limit)

    def add_to_queue(self, queue_id: int, conversation_id: int) -> Optional[int]:
        if not self.queue_repo.get_by_id(queue_id):
            return None
        position = len(self.queue_item_repo.list_by_queue(queue_id)) + 1
        item = self.queue_item_repo.create(queue_id=queue_id, conversation_id=conversation_id, position=position)
        return item.id

    def get_next_in_queue(self, queue_id: int):
        return self.queue_item_repo.get_next_in_queue(queue_id)

    def process_queue_item(self, queue_item_id: int, attendant_id: int):
        item = self.queue_item_repo.update_status(queue_item_id, "processing")
        if item:
            self.conversation_repo.update(item.conversation_id, assigned_attendant_id=attendant_id)
        return item

    def complete_queue_item(self, queue_item_id: int):
        return self.queue_item_repo.update_status(queue_item_id, "completed")


def get_user_service(db: Session) -> UserService:
    return UserService(db)


def get_contact_service(db: Session) -> ContactService:
    return ContactService(db)


def get_conversation_service(db: Session) -> ConversationService:
    return ConversationService(db)


def get_message_service(db: Session) -> MessageService:
    return MessageService(db)


def get_queue_service(db: Session) -> QueueService:
    return QueueService(db)
