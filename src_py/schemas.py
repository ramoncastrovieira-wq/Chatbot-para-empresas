"""Schemas Pydantic para validação e serialização de dados."""
from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import Any, Optional

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class UserRole(str, Enum):
    ADMIN = "admin"
    ATTENDANT = "attendant"
    USER = "user"


class UserBase(BaseModel):
    username: str
    email: Optional[EmailStr] = None
    role: UserRole = UserRole.USER


class UserCreate(UserBase):
    password: str = Field(min_length=6)


class UserUpdate(BaseModel):
    username: Optional[str] = None
    email: Optional[EmailStr] = None
    role: Optional[UserRole] = None
    is_active: Optional[bool] = None


class UserResponse(UserBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    is_active: bool
    created_at: datetime
    updated_at: datetime


class UserLoginRequest(BaseModel):
    username: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


class MetadataModel(BaseModel):
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

    metadata: dict[str, Any] = Field(default_factory=dict, validation_alias="metadata_", serialization_alias="metadata")


class ContactBase(BaseModel):
    name: str
    phone: str
    email: Optional[str] = None
    metadata: dict[str, Any] = Field(default_factory=dict)


class ContactCreate(ContactBase):
    pass


class ContactUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    metadata: Optional[dict[str, Any]] = None
    is_active: Optional[bool] = None


class ContactResponse(MetadataModel):
    id: int
    name: str
    phone: str
    email: Optional[str] = None
    is_active: bool
    created_at: datetime
    updated_at: datetime


class MessageBase(BaseModel):
    content: str
    sender_type: str = "user"
    message_type: str = "text"
    metadata: dict[str, Any] = Field(default_factory=dict)


class MessageCreate(MessageBase):
    conversation_id: int
    contact_id: int


class MessageResponse(MetadataModel):
    id: int
    conversation_id: int
    contact_id: int
    content: str
    sender_type: str
    message_type: str = "text"
    external_id: Optional[str] = None
    created_at: datetime
    updated_at: datetime


class ConversationBase(BaseModel):
    title: Optional[str] = None
    status: str = "open"
    metadata: dict[str, Any] = Field(default_factory=dict)


class ConversationCreate(ConversationBase):
    contact_id: int


class ConversationUpdate(BaseModel):
    title: Optional[str] = None
    status: Optional[str] = None
    attendant_id: Optional[int] = None
    assigned_attendant_id: Optional[int] = None
    metadata: Optional[dict[str, Any]] = None


class ConversationResponse(MetadataModel):
    id: int
    contact_id: int
    title: Optional[str] = None
    status: str = "open"
    attendant_id: Optional[int] = None
    assigned_attendant_id: Optional[int] = None
    created_at: datetime
    updated_at: datetime


class ConversationDetailResponse(ConversationResponse):
    contact: Optional[ContactResponse] = None
    messages: list[MessageResponse] = Field(default_factory=list)


class AttendantBase(BaseModel):
    name: str
    description: Optional[str] = None


class AttendantCreate(AttendantBase):
    user_id: int


class AttendantUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None


class AttendantResponse(AttendantBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    is_active: bool
    created_at: datetime
    updated_at: datetime


class QueueBase(BaseModel):
    name: str
    description: Optional[str] = None
    priority: int = 0


class QueueCreate(QueueBase):
    pass


class QueueUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    priority: Optional[int] = None
    is_active: Optional[bool] = None


class QueueResponse(QueueBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    is_active: bool
    created_at: datetime
    updated_at: datetime


class APIMessageResponse(BaseModel):
    message: str
    detail: Optional[str] = None


class HealthResponse(BaseModel):
    status: str = "healthy"
    version: str
    database: str = "connected"


class JobResponse(BaseModel):
    job_id: str
    status: str = "queued"
    result: Optional[dict[str, Any]] = None
    error: Optional[str] = None

class AttendantCreate(BaseModel):
    name: str
    email: str
    is_active: bool = True
    metadata: dict = {}
