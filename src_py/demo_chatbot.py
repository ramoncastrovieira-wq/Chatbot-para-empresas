"""Motor demonstrativo do fluxo operacional do HUB WhatsApp.

Simula a entrada do WhatsApp, registra contato/conversa/mensagens e faz a
triagem inicial por unidade, conforme o documento operacional da Tico Auto Peças.
"""
from __future__ import annotations

import re
from dataclasses import dataclass
from typing import Optional

from sqlalchemy.orm import Session

from src_py.database.models import Contact, Conversation, Message, Queue, QueueItem
from src_py.services import get_contact_service, get_conversation_service, get_queue_service


@dataclass
class DemoBotResult:
    contact: Contact
    conversation: Conversation
    user_message: Message
    bot_message: Message
    reply: str
    context: str
    queue_item_id: Optional[int] = None


_contexts: dict[str, str] = {}

DEFAULT_QUEUES = [
    ("Várzea Paulista - Centro", "Fila da unidade Várzea Paulista Centro", 40),
    ("Várzea Paulista - Jd. América", "Fila da unidade Várzea Paulista Jardim América", 35),
    ("Francisco Morato", "Fila da unidade Francisco Morato", 30),
    ("Taipas", "Fila da unidade Taipas", 25),
]

# Filas antigas que não devem mais aparecer como opção.
# Importante: removemos apenas "Várzea Paulista" quando estiver sozinha.
# As filas "Várzea Paulista - Centro" e "Várzea Paulista - Jd. América" devem continuar ativas.
REMOVED_QUEUE_NAMES = {
    "Jundiaí",
    "Jundiai",
    "Várzea Paulista",
    "Varzea Paulista",
    "Campo Limpo",
}

ALLOWED_QUEUE_NAMES = {name for name, _, _ in DEFAULT_QUEUES}

def cleanup_removed_queues(db: Session) -> int:
    """Desativa filas antigas/removidas que já existiam no banco local.

    Isso é necessário porque o banco PostgreSQL persiste os registros criados
    antes da alteração do projeto; alterar o código sozinho não apaga filas já
    gravadas.
    """
    removed = 0
    queues = db.query(Queue).all()
    for queue in queues:
        name = queue.name or ""
        normalized_name = name.strip().lower()
        if name in ALLOWED_QUEUE_NAMES:
            if not queue.is_active:
                queue.is_active = True
            continue
        if normalized_name in {item.lower() for item in REMOVED_QUEUE_NAMES}:
            queue.is_active = False
            removed += 1
    db.commit()
    return removed

UNIT_OPTIONS = {
    "1": "Várzea Paulista - Centro",
    "2": "Várzea Paulista - Jd. América",
    "3": "Francisco Morato",
    "4": "Taipas",
}

UNIT_MENU = (
    "Olá 👋\n"
    "Bem-vindo à Tico Auto Peças 🚗🔧\n\n"
    "Para agilizar seu atendimento, selecione abaixo a unidade mais próxima de você:\n\n"
    "1️⃣ Várzea Paulista — Centro\n"
    "2️⃣ Várzea Paulista — Jardim América\n"
    "3️⃣ Francisco Morato\n"
    "4️⃣ Taipas"
)

NAME_REQUEST_MESSAGE = (
    "Perfeito 👍\n\n"
    "Antes de continuarmos, qual é o seu nome?\n\n"
    "✍️ Digite abaixo para seguirmos com seu atendimento."
)

CATEGORY_MENU = (
    "Prazer, {name} 🚗🔧\n\n"
    "Agora selecione o tipo de produto ou sistema que deseja consultar:\n\n"
    "1️⃣ Sistema de Freios\n"
    "2️⃣ Suspensão\n"
    "3️⃣ Motor\n"
    "4️⃣ Correias\n"
    "5️⃣ Embreagem\n"
    "6️⃣ Filtragem\n"
    "7️⃣ Ignição\n"
    "8️⃣ Combustível\n"
    "9️⃣ Arrefecimento\n"
    "🔟 Lubrificação\n"
    "1️⃣1️⃣ Outros produtos"
)

TRANSFER_MESSAGE = (
    "Perfeito 🚗🔧\n\n"
    "Seu atendimento está sendo encaminhado para nossa equipe da unidade {unit}.\n\n"
    "Em instantes um especialista continuará seu atendimento."
)

CATEGORY_OPTIONS = {
    "1": "Sistema de Freios",
    "2": "Suspensão",
    "3": "Motor",
    "4": "Correias",
    "5": "Embreagem",
    "6": "Filtragem",
    "7": "Ignição",
    "8": "Combustível",
    "9": "Arrefecimento",
    "10": "Lubrificação",
    "11": "Outros produtos",
}

CATEGORY_ALIASES = {
    "freios": "1",
    "freio": "1",
    "suspensao": "2",
    "suspensão": "2",
    "motor": "3",
    "correia": "4",
    "correias": "4",
    "embreagem": "5",
    "filtro": "6",
    "filtragem": "6",
    "ignicao": "7",
    "ignição": "7",
    "combustivel": "8",
    "combustível": "8",
    "arrefecimento": "9",
    "lubrificacao": "10",
    "lubrificação": "10",
    "outros": "11",
    "outro": "11",
}

def _normalize_option(text: str) -> str:
    return (text or "").strip().lower().replace("º", "").replace("°", "")

def _detect_category(text: str) -> Optional[str]:
    normalized = _normalize_option(text)
    if normalized in CATEGORY_OPTIONS:
        return normalized
    return CATEGORY_ALIASES.get(normalized)

def reset_demo_context(phone: str) -> None:
    _contexts.pop(phone, None)


def seed_default_queues(db: Session) -> list[Queue]:
    service = get_queue_service(db)
    queues: list[Queue] = []
    for name, description, priority in DEFAULT_QUEUES:
        queue = service.get_queue_by_name(name)
        if not queue:
            queue = service.create_queue(name=name, description=description, priority=priority)
        else:
            queue.description = description
            queue.priority = priority
            queue.is_active = True
            db.flush()
        queues.append(queue)
    db.commit()
    return queues


def _queue_by_name(db: Session, name: str) -> Optional[Queue]:
    return db.query(Queue).filter(Queue.name == name, Queue.is_active.is_(True)).first()


def _detect_unit_queue(db: Session, text: str) -> Optional[Queue]:
    normalized = (text or "").strip().lower()
    option_name = UNIT_OPTIONS.get(normalized)
    if option_name:
        return _queue_by_name(db, option_name)
    for name in UNIT_OPTIONS.values():
        if name.lower() in normalized or name.split(" - ")[0].lower() in normalized:
            return _queue_by_name(db, name)
    return None


def _enqueue_if_possible(db: Session, conversation: Conversation, queue_id: Optional[int]) -> Optional[int]:
    if not queue_id:
        return None
    existing = (
        db.query(QueueItem)
        .filter(QueueItem.queue_id == queue_id, QueueItem.conversation_id == conversation.id, QueueItem.status.in_(["waiting", "processing"]))
        .first()
    )
    if existing:
        return existing.id
    conversation.queue_id = queue_id
    conversation.status = "open"
    db.flush()
    return get_queue_service(db).add_to_queue(queue_id, conversation.id)


def _selected_unit_name(db: Session, conversation: Conversation) -> Optional[str]:
    if not conversation.queue_id:
        return None
    queue = db.query(Queue).filter(Queue.id == conversation.queue_id).first()
    return queue.name if queue else None


def _clean_customer_name(text: str) -> Optional[str]:
    name = (text or "").strip()
    if not name:
        return None
    if len(name) < 2:
        return None
    if len(name) > 80:
        name = name[:80].strip()
    # Evita aceitar números puros como nome.
    if name.isdigit():
        return None
    return name


def _generate_reply(phone: str, content: str, db: Session, conversation: Conversation) -> tuple[str, str, Optional[int]]:
    text = (content or "").strip()
    lower = text.lower()
    current = _contexts.get(phone) or (conversation.metadata_ or {}).get("bot_step")

    if not current or re.search(r"^(oi|ol[aá]|bom dia|boa tarde|boa noite|menu|começar|comecar|iniciar|reiniciar)$", lower):
        _contexts[phone] = "unit_menu"
        return UNIT_MENU, "unit_menu", None

    if current == "unit_menu":
        queue = _detect_unit_queue(db, text)
        if not queue:
            return "Não consegui identificar a unidade. Responda apenas 1, 2, 3 ou 4.\n\n" + UNIT_MENU, "unit_menu", None
        conversation.queue_id = queue.id
        conversation.status = "open"
        conversation.metadata_ = {**(conversation.metadata_ or {}), "selected_unit": queue.name, "bot_step": "ask_name"}
        db.flush()
        _contexts[phone] = "ask_name"
        return NAME_REQUEST_MESSAGE, "ask_name", None

    unit_name = _selected_unit_name(db, conversation)
    if not unit_name:
        _contexts[phone] = "unit_menu"
        return UNIT_MENU, "unit_menu", None

    if current == "ask_name":
        customer_name = _clean_customer_name(text)
        if not customer_name:
            return "Não consegui identificar seu nome. Por favor, digite seu nome para seguirmos com o atendimento.", "ask_name", None
        if conversation.contact:
            conversation.contact.name = customer_name
        conversation.metadata_ = {
            **(conversation.metadata_ or {}),
            "selected_unit": unit_name,
            "customer_name": customer_name,
            "bot_step": "category_menu",
        }
        db.flush()
        _contexts[phone] = "category_menu"
        return CATEGORY_MENU.format(name=customer_name), "category_menu", None

    if current == "category_menu":
        category_id = _detect_category(text)
        if not category_id:
            return "Não consegui identificar a categoria. Responda com um número de 1 a 11.\n\n" + CATEGORY_MENU.format(name=(conversation.metadata_ or {}).get("customer_name", "cliente")), "category_menu", None
        category_name = CATEGORY_OPTIONS[category_id]
        conversation.metadata_ = {
            **(conversation.metadata_ or {}),
            "selected_unit": unit_name,
            "selected_category": category_name,
            "bot_step": "waiting_attendant",
        }
        queue_item_id = _enqueue_if_possible(db, conversation, conversation.queue_id)
        db.flush()
        _contexts[phone] = "waiting_attendant"
        return TRANSFER_MESSAGE.format(unit=unit_name), "waiting_attendant", queue_item_id

    if current == "waiting_attendant":
        queue_item_id = _enqueue_if_possible(db, conversation, conversation.queue_id)
        return TRANSFER_MESSAGE.format(unit=unit_name), "waiting_attendant", queue_item_id

    _contexts[phone] = "unit_menu"
    return UNIT_MENU, "unit_menu", None

def process_demo_chat(db: Session, phone: str, name: str, content: str, queue_id: Optional[int] = None) -> DemoBotResult:
    seed_default_queues(db)
    contact_service = get_contact_service(db)
    conversation_service = get_conversation_service(db)

    contact = contact_service.get_contact_by_phone(phone)
    if not contact:
        contact = contact_service.create_contact(phone=phone, name=name or "Cliente Demo", email=None, metadata={"source": "demo_whatsapp"})

    conversation = conversation_service.get_or_create_conversation(contact.id, title="Atendimento WhatsApp Demo", queue_id=queue_id)

    user_message = Message(
        conversation_id=conversation.id,
        contact_id=contact.id,
        content=content,
        sender_type="user",
        message_type="text",
        metadata_={"source": "demo_whatsapp"},
    )
    db.add(user_message)
    db.flush()

    reply, context, queue_item_id = _generate_reply(phone, content, db, conversation)

    bot_message = Message(
        conversation_id=conversation.id,
        contact_id=contact.id,
        content=reply,
        sender_type="bot",
        message_type="text",
        metadata_={"source": "demo_chatbot", "context": context},
    )
    db.add(bot_message)
    db.commit()
    db.refresh(contact)
    db.refresh(conversation)
    db.refresh(user_message)
    db.refresh(bot_message)

    return DemoBotResult(contact=contact, conversation=conversation, user_message=user_message, bot_message=bot_message, reply=reply, context=context, queue_item_id=queue_item_id)
