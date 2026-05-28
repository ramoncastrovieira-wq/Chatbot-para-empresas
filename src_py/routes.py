"""Endpoints principais da API FastAPI."""
from __future__ import annotations

from datetime import timedelta
import httpx
from typing import Optional

from fastapi import APIRouter, Body, Depends, HTTPException, Query, status
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



async def _send_to_whatsapp_official(phone: str, message: str) -> dict:
    """Modo interno: a camada externa WhatsApp/Evolution está desativada por enquanto.

    Nesta etapa do MVP, o painel salva tudo no histórico e permite validar
    filas, atendentes, assumir/finalizar e fluxo operacional sem depender de
    provedor externo de mensagens.
    """
    return {
        "sent": False,
        "skipped": True,
        "provider": "internal_simulator",
        "reason": "external_messaging_disabled",
        "detail": "Integração externa temporariamente desativada. Mensagem salva apenas no sistema.",
    }


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






@router.get("/reports/daily")
async def daily_operational_report(db: Session = Depends(get_db)):
    """Relatório operacional simples para o supervisor.

    Mantém o MVP interno preparado para governança: filas, status, SLA e fechamento diário.
    """
    queues = db.query(Queue).filter(Queue.is_active.is_(True)).order_by(Queue.priority.desc(), Queue.name).all()
    conversations = db.query(Conversation).all()

    def is_today(value):
        if not value:
            return False
        try:
            return value.date().isoformat() == __import__("datetime").datetime.utcnow().date().isoformat()
        except Exception:
            return False

    def minutes_since(value):
        if not value:
            return 0
        try:
            now = __import__("datetime").datetime.utcnow()
            if getattr(value, "tzinfo", None):
                value = value.replace(tzinfo=None)
            return max(0, round((now - value).total_seconds() / 60))
        except Exception:
            return 0

    rows = []
    for queue in queues:
        q_convs = [c for c in conversations if c.queue_id == queue.id]
        waiting = [c for c in q_convs if c.status == "open"]
        in_progress = [c for c in q_convs if c.status == "in_progress"]
        closed_today = [c for c in q_convs if c.status == "closed" and is_today(c.updated_at)]
        active = [c for c in q_convs if c.status != "closed"]
        max_wait = max([minutes_since(c.updated_at or c.created_at) for c in active], default=0)
        rows.append({
            "queue_id": queue.id,
            "queue": queue.name,
            "waiting": len(waiting),
            "in_progress": len(in_progress),
            "closed_today": len(closed_today),
            "active": len(active),
            "max_wait_minutes": max_wait,
            "sla": "red" if max_wait >= 30 else "yellow" if max_wait >= 10 else "green",
        })

    return {
        "total": len(conversations),
        "waiting": len([c for c in conversations if c.status == "open"]),
        "in_progress": len([c for c in conversations if c.status == "in_progress"]),
        "closed_today": len([c for c in conversations if c.status == "closed" and is_today(c.updated_at)]),
        "sla_red": sum(1 for c in conversations if c.status != "closed" and minutes_since(c.updated_at or c.created_at) >= 30),
        "queues": rows,
    }

@router.get("/whatsapp/status")
async def whatsapp_status():
    """Status da camada de mensageria externa.

    Evolution/Meta/QR Code estão pulados nesta versão. O sistema opera em
    modo interno para validar painel, filas e atendimento.
    """
    return {
        "provider": "internal_simulator",
        "mode": "panel_only",
        "qr_code": False,
        "configured": False,
        "ready_to_send": False,
        "webhook_ready": False,
        "external_messaging_enabled": False,
        "note": "Integração externa pulada por enquanto. Use o simulador interno e o painel operacional.",
    }


@router.get("/operational/status")
async def operational_status():
    return {
        "mode": "internal_panel_mvp",
        "external_messaging_enabled": False,
        "focus": ["painel", "filas", "atendentes", "histórico", "métricas"],
        "next_external_options": ["Evolution API", "Meta Cloud API"],
    }


@router.post("/whatsapp/test-send")
async def whatsapp_test_send(payload: dict = Body(...)):
    """Endpoint mantido apenas para compatibilidade visual. Envio externo desativado."""
    phone = payload.get("phone") or payload.get("to")
    message = payload.get("message") or payload.get("text") or "Teste de envio pelo HUB Tico Auto Peças."
    if not phone:
        raise HTTPException(status_code=400, detail="Informe phone ou to")
    result = await _send_to_whatsapp_official(phone, message)
    return {"ok": False, "gateway": result, "message": message}


@router.post("/setup/seed-queues", response_model=list[QueueResponse])
async def seed_default_queues(db: Session = Depends(get_db)):
    """Cria as filas operacionais previstas no documento do HUB."""
    from src_py.demo_chatbot import DEFAULT_QUEUES

    service = get_queue_service(db)
    created = []
    for name, description, priority in DEFAULT_QUEUES:
        queue = service.get_queue_by_name(name)
        if not queue:
            queue = service.create_queue(name=name, description=description, priority=priority)
        else:
            queue.description = description
            queue.priority = priority
            queue.is_active = True
            db.flush()
        created.append(queue)
    db.commit()
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



@router.post("/panel/send-message")
async def panel_send_message(msg_data: MessageCreate, db: Session = Depends(get_db)):
    """Envia mensagem digitada no painel.

    Sempre salva no histórico. Se o gateway estiver conectado, também envia ao WhatsApp real.
    O retorno informa se o envio ao gateway funcionou, sem bloquear a operação do atendente.
    """
    service = get_message_service(db)
    conversation = get_conversation_service(db).get_conversation(msg_data.conversation_id)
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")
    if conversation.contact_id != msg_data.contact_id:
        raise HTTPException(status_code=400, detail="contact_id does not match conversation.contact_id")

    if not msg_data.content or not msg_data.content.strip():
        raise HTTPException(status_code=400, detail="Message content is empty")

    conversation.status = "in_progress"
    db.flush()

    gateway_result = {"sent": False, "skipped": True, "reason": "no_phone"}
    contact = conversation.contact
    if contact and contact.phone:
        gateway_result = await _send_to_whatsapp_official(contact.phone, msg_data.content)

    message = service.create_message(
        conversation_id=msg_data.conversation_id,
        contact_id=msg_data.contact_id,
        content=msg_data.content,
        sender_type=msg_data.sender_type or "attendant",
        message_type=msg_data.message_type or "text",
        metadata={
            **(msg_data.metadata or {}),
            "sent_from_panel": True,
            "gateway_sent": bool(gateway_result.get("sent")),
            "gateway_result": gateway_result,
        },
    )

    return {
        "ok": True,
        "message": MessageResponse.model_validate(message).model_dump(mode="json", by_alias=True),
        "gateway": gateway_result,
    }


@router.get("/messages", response_model=list[MessageResponse])
async def list_messages(conversation_id: Optional[int] = Query(None), limit: int = Query(100, ge=1, le=500), db: Session = Depends(get_db)):
    """Lista mensagens. Se conversation_id for informado, retorna o histórico daquela conversa."""
    service = get_message_service(db)
    if conversation_id is not None:
        return [MessageResponse.model_validate(msg) for msg in service.get_conversation_history(conversation_id, limit)]
    return [MessageResponse.model_validate(msg) for msg in service.message_repo.list_recent(hours=24 * 365, limit=limit)]


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
        return MessageResponse.model_validate(messages[0])

    # Mensagem de atendente/supervisor: registra no histórico e tenta enviar pelo WhatsApp Gateway.
    if msg_data.sender_type in {"attendant", "supervisor", "admin"}:
        conversation.status = "in_progress"
        db.flush()

    message = service.create_message(
        conversation_id=msg_data.conversation_id,
        contact_id=msg_data.contact_id,
        content=msg_data.content,
        sender_type=msg_data.sender_type,
        message_type=msg_data.message_type,
        metadata={**(msg_data.metadata or {}), "sent_from_panel": True},
    )

    if msg_data.sender_type in {"attendant", "supervisor", "admin"}:
        try:
            contact = conversation.contact
            if contact and contact.phone:
                gateway_result = await _send_to_whatsapp_official(contact.phone, msg_data.content)
                message.metadata_ = {**(message.metadata_ or {}), "gateway_sent": bool(gateway_result.get("sent")), "gateway_result": gateway_result}
                db.commit()
        except Exception as exc:
            # Não bloqueia o painel: a mensagem fica salva no histórico mesmo se o gateway estiver desconectado.
            print(f"[Painel->WhatsApp] erro ao enviar pelo gateway: {exc}")

    return MessageResponse.model_validate(message)


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
