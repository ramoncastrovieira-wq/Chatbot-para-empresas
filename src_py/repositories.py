"""Repositórios para acesso a dados."""
from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any, Optional

from sqlalchemy import and_, desc
from sqlalchemy.orm import Session

from src_py.auth import hash_password
from src_py.database.models import Attendant, Contact, Conversation, Message, Queue, QueueItem, User


def _map_metadata_kwargs(kwargs: dict[str, Any]) -> dict[str, Any]:
    """Converte `metadata` recebido pela API para `metadata_` usado no ORM."""
    if "metadata" in kwargs:
        kwargs["metadata_"] = kwargs.pop("metadata") or {}
    return kwargs


class BaseRepository:
    def __init__(self, db: Session):
        self.db = db

    def commit(self) -> None:
        self.db.commit()

    def rollback(self) -> None:
        self.db.rollback()

    def flush(self) -> None:
        self.db.flush()


class UserRepository(BaseRepository):
    def create(self, username: str, email: str | None, password: str, role: str = "user") -> User:
        user = User(username=username, email=email, hashed_password=hash_password(password), role=role)
        self.db.add(user)
        self.commit()
        self.db.refresh(user)
        return user

    def get_by_id(self, user_id: int) -> Optional[User]:
        return self.db.query(User).filter(User.id == user_id).first()

    def get_by_username(self, username: str) -> Optional[User]:
        return self.db.query(User).filter(User.username == username).first()

    def get_by_email(self, email: str) -> Optional[User]:
        return self.db.query(User).filter(User.email == email).first()

    def list_all(self, skip: int = 0, limit: int = 100) -> list[User]:
        return self.db.query(User).offset(skip).limit(limit).all()

    def update(self, user_id: int, **kwargs: Any) -> Optional[User]:
        user = self.get_by_id(user_id)
        if user:
            for key, value in kwargs.items():
                if hasattr(user, key) and value is not None:
                    setattr(user, key, value)
            self.commit()
            self.db.refresh(user)
        return user


class ContactRepository(BaseRepository):
    def create(self, phone: str, name: str, email: str | None = None, metadata: dict[str, Any] | None = None) -> Contact:
        contact = Contact(phone=phone, name=name, email=email, metadata_=metadata or {})
        self.db.add(contact)
        self.commit()
        self.db.refresh(contact)
        return contact

    def get_by_id(self, contact_id: int) -> Optional[Contact]:
        return self.db.query(Contact).filter(Contact.id == contact_id).first()

    def get_by_phone(self, phone: str) -> Optional[Contact]:
        return self.db.query(Contact).filter(Contact.phone == phone).first()

    def get_or_create(self, phone: str, name: str, email: str | None = None) -> Contact:
        contact = self.get_by_phone(phone)
        return contact or self.create(phone=phone, name=name, email=email)

    def list_all(self, skip: int = 0, limit: int = 100) -> list[Contact]:
        return self.db.query(Contact).order_by(desc(Contact.created_at)).offset(skip).limit(limit).all()

    def update(self, contact_id: int, **kwargs: Any) -> Optional[Contact]:
        contact = self.get_by_id(contact_id)
        if contact:
            kwargs = _map_metadata_kwargs(kwargs)
            for key, value in kwargs.items():
                if hasattr(contact, key) and value is not None:
                    setattr(contact, key, value)
            self.commit()
            self.db.refresh(contact)
        return contact


class ConversationRepository(BaseRepository):
    def create(self, contact_id: int, title: str | None = None, metadata: dict[str, Any] | None = None, queue_id: int | None = None) -> Conversation:
        conversation = Conversation(contact_id=contact_id, title=title, queue_id=queue_id, metadata_=metadata or {}, status="open")
        self.db.add(conversation)
        self.commit()
        self.db.refresh(conversation)
        return conversation

    def get_by_id(self, conversation_id: int) -> Optional[Conversation]:
        return self.db.query(Conversation).filter(Conversation.id == conversation_id).first()

    def get_active_by_contact(self, contact_id: int) -> Optional[Conversation]:
        return self.db.query(Conversation).filter(
            and_(Conversation.contact_id == contact_id, Conversation.status.in_(["open", "in_progress"]))
        ).order_by(desc(Conversation.created_at)).first()

    def list_all(self, skip: int = 0, limit: int = 100) -> list[Conversation]:
        return self.db.query(Conversation).order_by(desc(Conversation.updated_at)).offset(skip).limit(limit).all()

    def list_by_contact(self, contact_id: int, skip: int = 0, limit: int = 100) -> list[Conversation]:
        return self.db.query(Conversation).filter(Conversation.contact_id == contact_id).order_by(desc(Conversation.updated_at)).offset(skip).limit(limit).all()

    def list_by_status(self, status: str, skip: int = 0, limit: int = 100) -> list[Conversation]:
        return self.db.query(Conversation).filter(Conversation.status == status).order_by(desc(Conversation.updated_at)).offset(skip).limit(limit).all()

    def list_by_attendant(self, attendant_id: int, skip: int = 0, limit: int = 100) -> list[Conversation]:
        return self.db.query(Conversation).filter(Conversation.assigned_attendant_id == attendant_id).order_by(desc(Conversation.updated_at)).offset(skip).limit(limit).all()

    def update(self, conversation_id: int, **kwargs: Any) -> Optional[Conversation]:
        conversation = self.get_by_id(conversation_id)
        if conversation:
            kwargs = _map_metadata_kwargs(kwargs)
            for key, value in kwargs.items():
                if hasattr(conversation, key) and value is not None:
                    setattr(conversation, key, value)
            self.commit()
            self.db.refresh(conversation)
        return conversation

    def close(self, conversation_id: int) -> Optional[Conversation]:
        return self.update(conversation_id, status="closed")


class MessageRepository(BaseRepository):
    def create(
        self,
        conversation_id: int,
        contact_id: int,
        content: str,
        sender_type: str,
        message_type: str = "text",
        external_id: str | None = None,
        metadata: dict[str, Any] | None = None,
    ) -> Message:
        message = Message(
            conversation_id=conversation_id,
            contact_id=contact_id,
            content=content,
            sender_type=sender_type,
            message_type=message_type,
            external_id=external_id,
            metadata_=metadata or {},
        )
        self.db.add(message)
        self.commit()
        self.db.refresh(message)
        return message

    def get_by_id(self, message_id: int) -> Optional[Message]:
        return self.db.query(Message).filter(Message.id == message_id).first()

    def get_by_external_id(self, external_id: str) -> Optional[Message]:
        return self.db.query(Message).filter(Message.external_id == external_id).first()

    def list_by_conversation(self, conversation_id: int, limit: int = 100) -> list[Message]:
        return self.db.query(Message).filter(Message.conversation_id == conversation_id).order_by(desc(Message.created_at)).limit(limit).all()

    def list_recent(self, hours: int = 24, limit: int = 100) -> list[Message]:
        since = datetime.now(timezone.utc) - timedelta(hours=hours)
        return self.db.query(Message).filter(Message.created_at >= since).order_by(desc(Message.created_at)).limit(limit).all()


class QueueRepository(BaseRepository):
    def create(self, name: str, description: str | None = None, priority: int = 0) -> Queue:
        queue = Queue(name=name, description=description, priority=priority)
        self.db.add(queue)
        self.commit()
        self.db.refresh(queue)
        return queue

    def get_by_id(self, queue_id: int) -> Optional[Queue]:
        return self.db.query(Queue).filter(Queue.id == queue_id).first()

    def get_by_name(self, name: str) -> Optional[Queue]:
        return self.db.query(Queue).filter(Queue.name == name).first()

    def list_all(self, skip: int = 0, limit: int = 100) -> list[Queue]:
        return self.db.query(Queue).filter(Queue.is_active.is_(True)).order_by(desc(Queue.priority), Queue.name).offset(skip).limit(limit).all()


class QueueItemRepository(BaseRepository):
    def create(self, queue_id: int, conversation_id: int, position: int) -> QueueItem:
        queue_item = QueueItem(queue_id=queue_id, conversation_id=conversation_id, position=position, status="waiting")
        self.db.add(queue_item)
        self.commit()
        self.db.refresh(queue_item)
        return queue_item

    def get_next_in_queue(self, queue_id: int) -> Optional[QueueItem]:
        return self.db.query(QueueItem).filter(and_(QueueItem.queue_id == queue_id, QueueItem.status == "waiting")).order_by(QueueItem.position).first()

    def list_by_queue(self, queue_id: int) -> list[QueueItem]:
        return self.db.query(QueueItem).filter(QueueItem.queue_id == queue_id).order_by(QueueItem.position).all()

    def update_status(self, queue_item_id: int, status: str) -> Optional[QueueItem]:
        item = self.db.query(QueueItem).filter(QueueItem.id == queue_item_id).first()
        if item:
            item.status = status
            self.commit()
            self.db.refresh(item)
        return item
