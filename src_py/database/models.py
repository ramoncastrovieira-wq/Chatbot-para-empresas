"""
Modelos de banco de dados com SQLAlchemy.

Observação importante:
SQLAlchemy reserva o nome `metadata` no modelo declarativo. Por isso,
os campos JSON chamados `metadata` no banco são mapeados como `metadata_`
no Python, mantendo o nome real da coluna como `metadata`.
"""
from __future__ import annotations

import enum

from sqlalchemy import Boolean, Column, DateTime, Enum as SQLEnum, ForeignKey, Integer, JSON, String, Text
from sqlalchemy.orm import declarative_base, relationship
from sqlalchemy.sql import func

Base = declarative_base()


class UserRole(str, enum.Enum):
    ADMIN = "admin"
    ATTENDANT = "attendant"
    USER = "user"


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(255), unique=True, index=True, nullable=False)
    email = Column(String(255), unique=True, index=True, nullable=True)
    hashed_password = Column(String(255), nullable=False)
    role = Column(SQLEnum(UserRole), default=UserRole.USER, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    attendants = relationship("Attendant", back_populates="user", cascade="all, delete-orphan")
    conversations = relationship("Conversation", back_populates="assigned_attendant")


class Attendant(Base):
    __tablename__ = "attendants"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    user = relationship("User", back_populates="attendants")
    conversations = relationship("Conversation", back_populates="attendant")


class Contact(Base):
    __tablename__ = "contacts"

    id = Column(Integer, primary_key=True, index=True)
    phone = Column(String(32), unique=True, index=True, nullable=False)
    name = Column(String(255), nullable=False)
    email = Column(String(255), nullable=True)
    metadata_ = Column("metadata", JSON, nullable=False, default=dict)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    conversations = relationship("Conversation", back_populates="contact", cascade="all, delete-orphan")
    messages = relationship("Message", back_populates="contact")


class Conversation(Base):
    __tablename__ = "conversations"

    id = Column(Integer, primary_key=True, index=True)
    contact_id = Column(Integer, ForeignKey("contacts.id"), nullable=False)
    queue_id = Column(Integer, ForeignKey("queues.id"), nullable=True, index=True)
    attendant_id = Column(Integer, ForeignKey("attendants.id"), nullable=True)
    assigned_attendant_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    title = Column(String(255), nullable=True)
    status = Column(String(50), default="open", index=True, nullable=False)
    metadata_ = Column("metadata", JSON, nullable=False, default=dict)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    contact = relationship("Contact", back_populates="conversations")
    queue = relationship("Queue", back_populates="conversations")
    attendant = relationship("Attendant", back_populates="conversations")
    assigned_attendant = relationship("User", back_populates="conversations")
    messages = relationship("Message", back_populates="conversation", cascade="all, delete-orphan")
    queue_items = relationship("QueueItem", back_populates="conversation", cascade="all, delete-orphan")


class Message(Base):
    __tablename__ = "messages"

    id = Column(Integer, primary_key=True, index=True)
    conversation_id = Column(Integer, ForeignKey("conversations.id"), nullable=False)
    contact_id = Column(Integer, ForeignKey("contacts.id"), nullable=False)
    sender_type = Column(String(50), nullable=False)  # user, bot, attendant
    content = Column(Text, nullable=False)
    message_type = Column(String(50), default="text", nullable=False)
    external_id = Column(String(255), nullable=True, unique=True)
    metadata_ = Column("metadata", JSON, nullable=False, default=dict)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    conversation = relationship("Conversation", back_populates="messages")
    contact = relationship("Contact", back_populates="messages")


class Queue(Base):
    __tablename__ = "queues"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), unique=True, nullable=False)
    description = Column(Text, nullable=True)
    priority = Column(Integer, default=0, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    queue_items = relationship("QueueItem", back_populates="queue", cascade="all, delete-orphan")
    conversations = relationship("Conversation", back_populates="queue")


class QueueItem(Base):
    __tablename__ = "queue_items"

    id = Column(Integer, primary_key=True, index=True)
    queue_id = Column(Integer, ForeignKey("queues.id"), nullable=False)
    conversation_id = Column(Integer, ForeignKey("conversations.id"), nullable=False)
    position = Column(Integer, nullable=False)
    status = Column(String(50), default="waiting", nullable=False)  # waiting, processing, completed
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    queue = relationship("Queue", back_populates="queue_items")
    conversation = relationship("Conversation", back_populates="queue_items")
