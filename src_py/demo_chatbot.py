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
    ("Francisco Morato", "Fila da unidade Francisco Morato", 30),
    ("Taipas", "Fila da unidade Taipas", 25),
]

REMOVED_QUEUE_KEYWORDS = [
    "Jundiaí",
    "Jundiai",
    "Várzea Paulista",
    "Varzea Paulista",
    "Campo Limpo",
]

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
        if name in ALLOWED_QUEUE_NAMES:
            continue
        if any(keyword.lower() in name.lower() for keyword in REMOVED_QUEUE_KEYWORDS):
            queue.is_active = False
            removed += 1
    db.commit()
    return removed

UNIT_OPTIONS = {
    "3": "Francisco Morato",
    "4": "Taipas",
}

UNIT_MENU = (
    "Olá 👋\n"
    "Bem-vindo à Tico Auto Peças.\n"
    "Selecione a unidade desejada para atendimento:\n\n"
    "3️⃣ Francisco Morato\n"
    "4️⃣ Taipas"
)

POST_UNIT_MENU = (
    "Perfeito, atendimento direcionado para {unit}.\n\n"
    "Agora escolha uma opção:\n"
    "1) Ver produtos\n"
    "2) Solicitar orçamento\n"
    "3) Falar com atendente"
)

CATEGORY_MENU = (
    "Escolha uma categoria:\n"
    "1) Freios\n"
    "2) Motor e manutenção\n"
    "3) Suspensão\n"
    "4) Iluminação\n"
    "0) Voltar ao menu"
)

PRODUCTS = {
    "1": {"title": "Freios", "items": {"1": "Pastilha de Freio A — Código: FREIO-A.", "2": "Disco de Freio B — Código: DISCO-B.", "3": "Kit de Reparo — Código: KIT-FREIO."}},
    "2": {"title": "Motor e manutenção", "items": {"1": "Filtro de Óleo — Código: FILTRO-OLEO.", "2": "Jogo de Velas — Código: VELAS-SET.", "3": "Correia Dentada — Código: CORREIA-1."}},
    "3": {"title": "Suspensão", "items": {"1": "Amortecedor Dianteiro — Código: AMORT-DF.", "2": "Mola Helicoidal — Código: MOLA-1.", "3": "Bieleta — Código: BIELETA-1."}},
    "4": {"title": "Iluminação", "items": {"1": "Farol Halógeno — Código: FAROL-H.", "2": "Lâmpada LED — Código: LAMP-LED.", "3": "Lanternas Traseiras — Código: LANT-T."}},
}


def reset_demo_context(phone: str) -> None:
    _contexts.pop(phone, None)


def seed_default_queues(db: Session) -> list[Queue]:
    service = get_queue_service(db)
    queues: list[Queue] = []
    for name, description, priority in DEFAULT_QUEUES:
        queue = service.get_queue_by_name(name)
        if not queue:
            queue = service.create_queue(name=name, description=description, priority=priority)
        queues.append(queue)
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


def _format_products(category_id: str) -> str:
    category = PRODUCTS[category_id]
    lines = [f"{category['title']}:"]
    for key, value in category["items"].items():
        lines.append(f"{key}) {value}")
    lines.append("0) Voltar ao menu")
    return "\n".join(lines)


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


def _generate_reply(phone: str, content: str, db: Session, conversation: Conversation) -> tuple[str, str, Optional[int]]:
    text = (content or "").strip()
    lower = text.lower()
    current = _contexts.get(phone)

    if not current or re.search(r"^(oi|ol[aá]|bom dia|boa tarde|boa noite|menu|começar|comecar|iniciar)$", lower):
        _contexts[phone] = "unit_menu"
        return UNIT_MENU, "unit_menu", None

    if current == "unit_menu":
        queue = _detect_unit_queue(db, text)
        if not queue:
            return "Não consegui identificar a unidade. Responda apenas 1, 2, 3 ou 4.\n\n" + UNIT_MENU, "unit_menu", None
        conversation.queue_id = queue.id
        conversation.metadata_ = {**(conversation.metadata_ or {}), "selected_unit": queue.name}
        db.flush()
        _contexts[phone] = "main_menu"
        return POST_UNIT_MENU.format(unit=queue.name), "main_menu", None

    unit_name = _selected_unit_name(db, conversation)
    if not unit_name:
        _contexts[phone] = "unit_menu"
        return UNIT_MENU, "unit_menu", None

    if current == "main_menu":
        if text == "1" or "produto" in lower or "peça" in lower or "peca" in lower:
            _contexts[phone] = "category_menu"
            return CATEGORY_MENU, "category_menu", None
        if text == "2" or "orçamento" in lower or "orcamento" in lower:
            _contexts[phone] = "collect_quote"
            return "Certo. Informe nome da peça, modelo do veículo e quantidade. A conversa ficará registrada para a unidade selecionada.", "collect_quote", None
        if text == "3" or "atendente" in lower or "humano" in lower:
            queue_item_id = _enqueue_if_possible(db, conversation, conversation.queue_id)
            _contexts[phone] = "waiting_attendant"
            return f"Perfeito. Encaminhei sua conversa para a fila {unit_name}. Aguarde um momento.", "waiting_attendant", queue_item_id
        return "Não entendi. Responda 1, 2 ou 3.\n\n" + POST_UNIT_MENU.format(unit=unit_name), "main_menu", None

    if current == "category_menu":
        if text == "0":
            _contexts[phone] = "main_menu"
            return POST_UNIT_MENU.format(unit=unit_name), "main_menu", None
        if text in PRODUCTS:
            _contexts[phone] = f"browse_products:{text}"
            return _format_products(text), f"browse_products:{text}", None
        return "Escolha uma categoria válida: 1, 2, 3, 4 ou 0 para voltar.", "category_menu", None

    if current and current.startswith("browse_products:"):
        category_id = current.split(":", 1)[1]
        if text == "0":
            _contexts[phone] = "main_menu"
            return POST_UNIT_MENU.format(unit=unit_name), "main_menu", None
        product = PRODUCTS.get(category_id, {}).get("items", {}).get(text)
        if product:
            _contexts[phone] = "collect_quote"
            return product + "\n\nPara solicitar orçamento, informe quantidade e veículo.", "collect_quote", None
        return "Produto inválido. Responda com o número do produto ou 0 para voltar.", current, None

    if current == "collect_quote":
        queue_item_id = _enqueue_if_possible(db, conversation, conversation.queue_id)
        _contexts[phone] = "waiting_attendant"
        return f"Obrigado. Recebemos sua solicitação. Um vendedor da fila {unit_name} vai continuar o atendimento.", "waiting_attendant", queue_item_id

    if current == "waiting_attendant":
        queue_item_id = _enqueue_if_possible(db, conversation, conversation.queue_id)
        return f"Sua conversa já está na fila {unit_name}. Um atendente dará sequência em breve.", "waiting_attendant", queue_item_id

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
