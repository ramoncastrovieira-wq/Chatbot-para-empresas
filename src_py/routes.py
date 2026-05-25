"""Endpoints principais da API FastAPI."""
from src_py.database import models
import src_py.schemas as schemas

from __future__ import annotations

from datetime import timedelta
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import text
from sqlalchemy.orm import Session

from src_py.auth import create_access_token, get_current_user
from src_py.config import get_db, settings
from src_py.schemas import (
    ContactCreate,
    ContactResponse,
    ContactUpdate,
    ConversationCreate,
    ConversationDetailResponse,
    ConversationResponse,
    ConversationUpdate,
    HealthResponse,
    JobResponse,
    MessageCreate,
    MessageResponse,
    QueueCreate,
    QueueResponse,
    TokenResponse,
    UserCreate,
    UserResponse,
    UserLoginRequest,
)
from src_py.services import get_contact_service, get_conversation_service, get_message_service, get_queue_service, get_user_service
from src_py.workers.queue import enqueue_incoming_message, get_job_status

router = APIRouter(prefix=settings.API_V1_STR, tags=["v1"])


@router.get("/health", response_model=HealthResponse)
async def health_check(db: Session = Depends(get_db)):
    try:
        db.execute(text("SELECT 1"))
        return HealthResponse(status="healthy", version=settings.PROJECT_VERSION, database="connected")
    except Exception as exc:
        raise HTTPException(status_code=503, detail=f"Database error: {exc}") from exc


@router.post("/auth/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register(user_data: UserCreate, db: Session = Depends(get_db)):
    service = get_user_service(db)
    if service.get_user_by_username(user_data.username):
        raise HTTPException(status_code=400, detail="Username already registered")
    return service.create_user(user_data.username, user_data.password, user_data.email, user_data.role.value)


@router.post("/auth/login", response_model=TokenResponse)
async def login(credentials: UserLoginRequest, db: Session = Depends(get_db)):
    service = get_user_service(db)
    user = service.authenticate(credentials.username, credentials.password)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    access_token = create_access_token(data={"sub": str(user.id), "username": user.username}, expires_delta=timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES))
    return TokenResponse(access_token=access_token, token_type="bearer", user=UserResponse.model_validate(user))


@router.get("/auth/me", response_model=UserResponse)
async def get_current_user_info(current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    user = get_user_service(db).get_user(int(current_user["sub"]))
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


@router.post("/contacts", response_model=ContactResponse, status_code=status.HTTP_201_CREATED)
async def create_contact(contact_data: ContactCreate, db: Session = Depends(get_db)):
    service = get_contact_service(db)
    if service.get_contact_by_phone(contact_data.phone):
        raise HTTPException(status_code=400, detail="Contact with this phone already exists")
    return service.create_contact(contact_data.phone, contact_data.name, contact_data.email, contact_data.metadata)


@router.get("/contacts", response_model=list[ContactResponse])
async def list_contacts(skip: int = Query(0, ge=0), limit: int = Query(100, ge=1, le=500), db: Session = Depends(get_db)):
    return get_contact_service(db).list_contacts(skip, limit)


@router.get("/contacts/{contact_id}", response_model=ContactResponse)
async def get_contact(contact_id: int, db: Session = Depends(get_db)):
    contact = get_contact_service(db).get_contact(contact_id)
    if not contact:
        raise HTTPException(status_code=404, detail="Contact not found")
    return contact


@router.patch("/contacts/{contact_id}", response_model=ContactResponse)
async def update_contact(contact_id: int, update_data: ContactUpdate, db: Session = Depends(get_db)):
    service = get_contact_service(db)
    contact = service.repo.update(contact_id, **update_data.model_dump(exclude_unset=True))
    if not contact:
        raise HTTPException(status_code=404, detail="Contact not found")
    return contact


@router.post("/conversations", response_model=ConversationResponse, status_code=status.HTTP_201_CREATED)
async def create_conversation(conv_data: ConversationCreate, db: Session = Depends(get_db)):
    if not get_contact_service(db).get_contact(conv_data.contact_id):
        raise HTTPException(status_code=404, detail="Contact not found")
    return get_conversation_service(db).create_conversation(conv_data.contact_id, conv_data.title, conv_data.metadata)


@router.get("/conversations", response_model=list[ConversationResponse])
async def list_conversations(
    contact_id: Optional[int] = Query(None),
    status_filter: Optional[str] = Query(None, alias="status"),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
):
    return get_conversation_service(db).list_conversations(contact_id, status_filter, skip, limit)


@router.get("/conversations/{conversation_id}", response_model=ConversationDetailResponse)
async def get_conversation(conversation_id: int, db: Session = Depends(get_db)):
    conv_service = get_conversation_service(db)
    conversation = conv_service.get_conversation(conversation_id)
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")
    result = ConversationDetailResponse.model_validate(conversation)
    result.messages = [MessageResponse.model_validate(msg) for msg in get_message_service(db).get_conversation_history(conversation_id)]
    return result


@router.patch("/conversations/{conversation_id}", response_model=ConversationResponse)
async def update_conversation(conversation_id: int, update_data: ConversationUpdate, db: Session = Depends(get_db)):
    conversation = get_conversation_service(db).conversation_repo.update(conversation_id, **update_data.model_dump(exclude_unset=True))
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return conversation


@router.post("/conversations/{conversation_id}/close", response_model=ConversationResponse)
async def close_conversation(conversation_id: int, db: Session = Depends(get_db)):
    conversation = get_conversation_service(db).close_conversation(conversation_id)
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return conversation


@router.post("/messages", response_model=MessageResponse, status_code=status.HTTP_201_CREATED)
async def send_message(msg_data: MessageCreate, db: Session = Depends(get_db)):
    service = get_message_service(db)
    conversation = get_conversation_service(db).get_conversation(msg_data.conversation_id)
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")
    await service.process_incoming_message(msg_data.conversation_id, msg_data.contact_id, msg_data.content)
    messages = service.message_repo.list_by_conversation(msg_data.conversation_id, limit=1)
    if not messages:
        raise HTTPException(status_code=500, detail="Failed to process message")
    return messages[0]


@router.post("/messages/async", response_model=JobResponse, status_code=status.HTTP_202_ACCEPTED)
async def enqueue_message(msg_data: MessageCreate, db: Session = Depends(get_db)):
    conversation = get_conversation_service(db).get_conversation(msg_data.conversation_id)
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")
    if conversation.contact_id != msg_data.contact_id:
        raise HTTPException(status_code=400, detail="contact_id does not match conversation.contact_id")
    job_id = enqueue_incoming_message(msg_data.conversation_id, msg_data.contact_id, msg_data.content)
    return JobResponse(job_id=job_id, status="queued")


@router.get("/jobs/{job_id}", response_model=JobResponse)
async def read_job_status(job_id: str):
    try:
        return JobResponse(**get_job_status(job_id))
    except Exception as exc:
        raise HTTPException(status_code=404, detail=f"Job not found or Redis unavailable: {exc}") from exc


@router.get("/conversations/{conversation_id}/messages", response_model=list[MessageResponse])
async def get_conversation_messages(conversation_id: int, limit: int = Query(50, ge=1, le=500), db: Session = Depends(get_db)):
    return [MessageResponse.model_validate(msg) for msg in get_message_service(db).get_conversation_history(conversation_id, limit)]


@router.post("/queues", response_model=QueueResponse, status_code=status.HTTP_201_CREATED)
async def create_queue(queue_data: QueueCreate, db: Session = Depends(get_db)):
    service = get_queue_service(db)
    if service.get_queue_by_name(queue_data.name):
        raise HTTPException(status_code=400, detail="Queue already exists")
    return service.create_queue(queue_data.name, queue_data.description, queue_data.priority)


@router.get("/queues", response_model=list[QueueResponse])
async def list_queues(skip: int = Query(0, ge=0), limit: int = Query(100, ge=1, le=500), db: Session = Depends(get_db)):
    return get_queue_service(db).list_queues(skip, limit)


@router.post("/queues/{queue_id}/add/{conversation_id}")
async def add_to_queue(queue_id: int, conversation_id: int, db: Session = Depends(get_db)):
    queue_item_id = get_queue_service(db).add_to_queue(queue_id, conversation_id)
    if not queue_item_id:
        raise HTTPException(status_code=404, detail="Queue not found")
    return {"message": "Added to queue", "queue_item_id": queue_item_id}


@router.get("/queues/{queue_id}/next")
async def get_next_in_queue(queue_id: int, db: Session = Depends(get_db)):
    item = get_queue_service(db).get_next_in_queue(queue_id)
    if not item:
        return {"message": "Queue is empty"}
    return {"queue_item_id": item.id, "conversation_id": item.conversation_id, "position": item.position}

@router.get("/attendants")
async def list_attendants(db: Session = Depends(get_db)):
    attendants = db.query(models.Attendant).all()
    return attendants


@router.post("/attendants")
async def create_attendant(
    attendant_data: schemas.AttendantCreate,
    db: Session = Depends(get_db)
):
    attendant = models.Attendant(
        name=attendant_data.name,
        email=attendant_data.email,
        is_active=attendant_data.is_active,
        metadata_=attendant_data.metadata or {}
    )

    db.add(attendant)
    db.commit()
    db.refresh(attendant)

    return attendant