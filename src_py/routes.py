"""Endpoints principais da API FastAPI."""
from __future__ import annotations

from datetime import timedelta
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, text
from sqlalchemy.orm import Session

from src_py.auth import create_access_token, get_current_user
from src_py.config import get_db, settings
from src_py.database.models import Attendant, Contact, Conversation, Message, Queue, QueueItem, User
from src_py.schemas import (
    AttendantCreate,
    AttendantResponse,
    AttendantUpdate,
    ContactCreate,
    ContactResponse,
    ContactUpdate,
    ConversationCreate,
    ConversationDetailResponse,
    ConversationResponse,
    ConversationUpdate,
    DashboardSummaryResponse,
    DemoChatRequest,
    DemoChatResponse,
    HealthResponse,
    JobResponse,
    MessageCreate,
    MessageResponse,
    QueueCreate,
    QueueUpdate,
    QueueItemResponse,
    QueueResponse,
    TokenResponse,
    UserCreate,
    UserUpdate,
    UserLoginRequest,
    UserResponse,
)
from src_py.services import (
    get_contact_service,
    get_conversation_service,
    get_message_service,
    get_queue_service,
    get_user_service,
)
from src_py.workers.queue import enqueue_incoming_message, get_job_status
from src_py.demo_chatbot import cleanup_removed_queues
from src_py.demo_chatbot import process_demo_chat, reset_demo_context

router = APIRouter(prefix=settings.API_V1_STR, tags=["v1"])


@router.get("/health", response_model=HealthResponse)
async def health_check(db: Session = Depends(get_db)):
    try:
        db.execute(text("SELECT 1"))
        return HealthResponse(status="healthy", version=settings.PROJECT_VERSION, database="connected")
    except Exception as exc:
        raise HTTPException(status_code=503, detail=f"Database error: {exc}") from exc


@router.get("/dashboard/summary", response_model=DashboardSummaryResponse)
async def dashboard_summary(db: Session = Depends(get_db)):
    return DashboardSummaryResponse(
        users=db.query(func.count(User.id)).scalar() or 0,
        attendants=db.query(func.count(Attendant.id)).scalar() or 0,
        contacts=db.query(func.count(Contact.id)).scalar() or 0,
        conversations=db.query(func.count(Conversation.id)).scalar() or 0,
        open_conversations=db.query(func.count(Conversation.id)).filter(Conversation.status == "open").scalar() or 0,
        in_progress_conversations=db.query(func.count(Conversation.id)).filter(Conversation.status == "in_progress").scalar() or 0,
        closed_conversations=db.query(func.count(Conversation.id)).filter(Conversation.status == "closed").scalar() or 0,
        messages=db.query(func.count(Message.id)).scalar() or 0,
        queues=db.query(func.count(Queue.id)).filter(Queue.is_active.is_(True)).scalar() or 0,
        waiting_queue_items=db.query(func.count(QueueItem.id)).filter(QueueItem.status == "waiting").scalar() or 0,
    )


@router.post("/setup/seed-queues", response_model=list[QueueResponse])
async def seed_default_queues(db: Session = Depends(get_db)):
    """Cria as filas operacionais previstas no documento do HUB."""
    defaults = [
        ("Francisco Morato", "Fila da unidade Francisco Morato", 30),
        ("Taipas", "Fila da unidade Taipas", 25),
    ]
    service = get_queue_service(db)
    created = []
    for name, description, priority in defaults:
        queue = service.get_queue_by_name(name)
        if not queue:
            queue = service.create_queue(name=name, description=description, priority=priority)
        created.append(queue)
    return created


@router.post("/setup/cleanup-removed-queues")
async def cleanup_removed_queues_endpoint(db: Session = Depends(get_db)):
    """Desativa filas antigas removidas da operação atual."""
    removed = cleanup_removed_queues(db)
    return {"status": "ok", "removed_or_deactivated": removed}


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
    access_token = create_access_token(
        data={"sub": str(user.id), "username": user.username},
        expires_delta=timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES),
    )
    return TokenResponse(access_token=access_token, token_type="bearer", user=UserResponse.model_validate(user))


@router.get("/auth/me", response_model=UserResponse)
async def get_current_user_info(current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    user = get_user_service(db).get_user(int(current_user["sub"]))
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


@router.get("/users", response_model=list[UserResponse])
async def list_users(skip: int = Query(0, ge=0), limit: int = Query(100, ge=1, le=500), db: Session = Depends(get_db)):
    return get_user_service(db).list_users(skip, limit)




@router.patch("/users/{user_id}", response_model=UserResponse)
async def update_user(user_id: int, update_data: UserUpdate, db: Session = Depends(get_db)):
    data = update_data.model_dump(exclude_unset=True)
    if "role" in data and data["role"] is not None:
        data["role"] = data["role"].value if hasattr(data["role"], "value") else data["role"]
    user = get_user_service(db).repo.update(user_id, **data)
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
    return get_conversation_service(db).create_conversation(conv_data.contact_id, conv_data.title, conv_data.metadata, conv_data.queue_id)


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
    conversation = get_conversation_service(db).conversation_repo.update(
        conversation_id,
        **update_data.model_dump(exclude_unset=True),
    )
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return conversation


@router.post("/conversations/{conversation_id}/close", response_model=ConversationResponse)
async def close_conversation(conversation_id: int, db: Session = Depends(get_db)):
    conversation = get_conversation_service(db).close_conversation(conversation_id)
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return conversation


@router.post("/conversations/{conversation_id}/assign/{attendant_id}", response_model=ConversationResponse)
async def assign_conversation(conversation_id: int, attendant_id: int, db: Session = Depends(get_db)):
    conversation = get_conversation_service(db).get_conversation(conversation_id)
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")

    attendant = db.query(Attendant).filter(Attendant.id == attendant_id, Attendant.is_active.is_(True)).first()
    if not attendant:
        raise HTTPException(status_code=404, detail="Attendant not found or inactive")

    conversation.attendant_id = attendant.id
    conversation.assigned_attendant_id = attendant.user_id
    conversation.status = "in_progress"

    waiting_items = db.query(QueueItem).filter(
        QueueItem.conversation_id == conversation_id,
        QueueItem.status == "waiting",
    ).all()
    for item in waiting_items:
        item.status = "processing"

    db.commit()
    db.refresh(conversation)
    return conversation


@router.post("/messages", response_model=MessageResponse, status_code=status.HTTP_201_CREATED)
async def send_message(msg_data: MessageCreate, db: Session = Depends(get_db)):
    service = get_message_service(db)
    conversation = get_conversation_service(db).get_conversation(msg_data.conversation_id)
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")
    if conversation.contact_id != msg_data.contact_id:
        raise HTTPException(status_code=400, detail="contact_id does not match conversation.contact_id")

    # Mensagem de cliente recebida pelo canal: salva entrada e gera resposta automática.
    if msg_data.sender_type == "user":
        await service.process_incoming_message(msg_data.conversation_id, msg_data.contact_id, msg_data.content)
        messages = service.message_repo.list_by_conversation(msg_data.conversation_id, limit=1)
        if not messages:
            raise HTTPException(status_code=500, detail="Failed to process message")
        return messages[0]

    # Mensagem de atendente/supervisor: apenas registra no histórico, sem acionar bot.
    return service.create_message(
        conversation_id=msg_data.conversation_id,
        contact_id=msg_data.contact_id,
        content=msg_data.content,
        sender_type=msg_data.sender_type,
        message_type=msg_data.message_type,
        metadata=msg_data.metadata,
    )


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




@router.patch("/queues/{queue_id}", response_model=QueueResponse)
async def update_queue(queue_id: int, update_data: QueueUpdate, db: Session = Depends(get_db)):
    queue = db.query(Queue).filter(Queue.id == queue_id).first()
    if not queue:
        raise HTTPException(status_code=404, detail="Queue not found")
    data = update_data.model_dump(exclude_unset=True)
    for key, value in data.items():
        if hasattr(queue, key) and value is not None:
            setattr(queue, key, value)
    db.commit()
    db.refresh(queue)
    return queue

@router.get("/queues/{queue_id}/items", response_model=list[QueueItemResponse])
async def list_queue_items(queue_id: int, status_filter: Optional[str] = Query(None, alias="status"), db: Session = Depends(get_db)):
    query = db.query(QueueItem).filter(QueueItem.queue_id == queue_id).order_by(QueueItem.position.asc())
    if status_filter:
        query = query.filter(QueueItem.status == status_filter)
    return query.all()


@router.post("/queues/{queue_id}/add/{conversation_id}")
async def add_to_queue(queue_id: int, conversation_id: int, db: Session = Depends(get_db)):
    if not get_conversation_service(db).get_conversation(conversation_id):
        raise HTTPException(status_code=404, detail="Conversation not found")
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


@router.get("/attendants", response_model=list[AttendantResponse])
async def list_attendants(skip: int = Query(0, ge=0), limit: int = Query(100, ge=1, le=500), db: Session = Depends(get_db)):
    return db.query(Attendant).order_by(Attendant.created_at.desc()).offset(skip).limit(limit).all()


@router.post("/attendants", response_model=AttendantResponse, status_code=status.HTTP_201_CREATED)
async def create_attendant(attendant_data: AttendantCreate, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == attendant_data.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    existing = db.query(Attendant).filter(Attendant.user_id == attendant_data.user_id).first()
    if existing:
        raise HTTPException(status_code=400, detail="Attendant already exists for this user")

    attendant = Attendant(
        user_id=attendant_data.user_id,
        name=attendant_data.name,
        description=attendant_data.description,
        is_active=True,
    )
    db.add(attendant)
    db.commit()
    db.refresh(attendant)
    return attendant


@router.get("/attendants/{attendant_id}", response_model=AttendantResponse)
async def get_attendant(attendant_id: int, db: Session = Depends(get_db)):
    attendant = db.query(Attendant).filter(Attendant.id == attendant_id).first()
    if not attendant:
        raise HTTPException(status_code=404, detail="Attendant not found")
    return attendant


@router.patch("/attendants/{attendant_id}", response_model=AttendantResponse)
async def update_attendant(attendant_id: int, update_data: AttendantUpdate, db: Session = Depends(get_db)):
    attendant = db.query(Attendant).filter(Attendant.id == attendant_id).first()
    if not attendant:
        raise HTTPException(status_code=404, detail="Attendant not found")
    data = update_data.model_dump(exclude_unset=True)
    for key, value in data.items():
        setattr(attendant, key, value)
    db.commit()
    db.refresh(attendant)
    return attendant


@router.post("/demo-chatbot/send", response_model=DemoChatResponse)
async def demo_chatbot_send(payload: DemoChatRequest, db: Session = Depends(get_db)):
    """Simula uma mensagem recebida pelo WhatsApp e responde com o chatbot demo."""
    result = process_demo_chat(
        db=db,
        phone=payload.phone,
        name=payload.name,
        content=payload.content,
        queue_id=payload.queue_id,
    )
    return DemoChatResponse(
        contact_id=result.contact.id,
        conversation_id=result.conversation.id,
        user_message_id=result.user_message.id,
        bot_message_id=result.bot_message.id,
        reply=result.reply,
        context=result.context,
        queue_item_id=result.queue_item_id,
    )


@router.post("/demo-chatbot/reset/{phone}")
async def demo_chatbot_reset(phone: str):
    """Limpa o contexto em memória do chatbot demo para um telefone."""
    reset_demo_context(phone)
    return {"message": "Demo chatbot context reset", "phone": phone}
