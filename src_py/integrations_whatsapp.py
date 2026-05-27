"""
Integração com WhatsApp - Wrapper Python
Implementa webhook para receber e enviar mensagens via WhatsApp Business API
"""
from typing import Optional, Dict, Any, List
from dataclasses import dataclass
import httpx
import json
import logging
from fastapi import APIRouter, Request, HTTPException
from datetime import datetime

logger = logging.getLogger(__name__)


@dataclass
class WhatsAppMessage:
    """Modelo de mensagem do WhatsApp"""
    from_phone: str
    to_phone: str
    message_id: str
    content: str
    timestamp: datetime
    message_type: str = "text"
    media_url: Optional[str] = None
    metadata: Dict[str, Any] = None


@dataclass
class WhatsAppContact:
    """Modelo de contato do WhatsApp"""
    phone: str
    name: str
    profile_picture_url: Optional[str] = None


class WhatsAppGateway:
    """Gateway para integração com WhatsApp Business API"""
    
    def __init__(self, business_account_id: str, access_token: str, webhook_token: str):
        self.business_account_id = business_account_id
        self.access_token = access_token
        self.webhook_token = webhook_token
        self.base_url = "https://graph.facebook.com/v18.0"
        self.http_client = httpx.AsyncClient()
    
    async def send_message(
        self,
        phone_number: str,
        message: str,
        message_type: str = "text",
        media_url: Optional[str] = None,
    ) -> bool:
        """Envia mensagem para contato"""
        
        payload = {
            "messaging_product": "whatsapp",
            "recipient_type": "individual",
            "to": phone_number,
            "type": message_type,
        }
        
        if message_type == "text":
            payload["text"] = {"body": message}
        elif message_type == "image":
            payload["image"] = {"link": media_url}
        elif message_type == "document":
            payload["document"] = {"link": media_url}
        
        try:
            url = f"{self.base_url}/{self.business_account_id}/messages"
            response = await self.http_client.post(
                url,
                json=payload,
                params={"access_token": self.access_token},
                timeout=10.0,
            )
            
            if response.status_code == 200:
                logger.info(f"Mensagem enviada para {phone_number}")
                return True
            else:
                logger.error(f"Erro ao enviar mensagem: {response.text}")
                return False
        
        except Exception as e:
            logger.error(f"Exceção ao enviar mensagem: {e}")
            return False
    
    async def send_template_message(
        self,
        phone_number: str,
        template_name: str,
        parameters: Optional[List[str]] = None,
    ) -> bool:
        """Envia mensagem template pré-aprovada"""
        
        payload = {
            "messaging_product": "whatsapp",
            "to": phone_number,
            "type": "template",
            "template": {
                "name": template_name,
            }
        }
        
        if parameters:
            payload["template"]["parameters"] = {
                "body": {
                    "parameters": [{"type": "text", "text": p} for p in parameters]
                }
            }
        
        try:
            url = f"{self.base_url}/{self.business_account_id}/messages"
            response = await self.http_client.post(
                url,
                json=payload,
                params={"access_token": self.access_token},
                timeout=10.0,
            )
            
            if response.status_code == 200:
                logger.info(f"Template enviado para {phone_number}")
                return True
            else:
                logger.error(f"Erro ao enviar template: {response.text}")
                return False
        
        except Exception as e:
            logger.error(f"Exceção ao enviar template: {e}")
            return False
    
    async def mark_as_read(self, message_id: str) -> bool:
        """Marca mensagem como lida"""
        
        payload = {
            "status": "read",
        }
        
        try:
            url = f"{self.base_url}/{message_id}"
            response = await self.http_client.post(
                url,
                json=payload,
                params={"access_token": self.access_token},
                timeout=10.0,
            )
            
            if response.status_code == 200:
                logger.info(f"Mensagem {message_id} marcada como lida")
                return True
            else:
                logger.error(f"Erro ao marcar como lida: {response.text}")
                return False
        
        except Exception as e:
            logger.error(f"Exceção ao marcar como lida: {e}")
            return False
    
    def parse_webhook_message(self, webhook_data: Dict[str, Any]) -> Optional[WhatsAppMessage]:
        """Parseia dados recebidos do webhook"""
        
        try:
            entry = webhook_data.get("entry", [{}])[0]
            changes = entry.get("changes", [{}])[0]
            value = changes.get("value", {})
            messages = value.get("messages", [])
            
            if not messages:
                return None
            
            msg_data = messages[0]
            
            # Extrair informações
            from_phone = msg_data.get("from")
            message_id = msg_data.get("id")
            timestamp = int(msg_data.get("timestamp", 0))
            message_type = msg_data.get("type", "text")
            
            # Extrair conteúdo baseado no tipo
            content = ""
            media_url = None
            
            if message_type == "text":
                content = msg_data.get("text", {}).get("body", "")
            elif message_type == "image":
                media_url = msg_data.get("image", {}).get("link")
                content = f"[Imagem] {media_url}"
            elif message_type == "document":
                media_url = msg_data.get("document", {}).get("link")
                filename = msg_data.get("document", {}).get("filename", "documento")
                content = f"[Documento] {filename}"
            elif message_type == "audio":
                media_url = msg_data.get("audio", {}).get("link")
                content = "[Áudio]"
            
            # Obter informações de contato
            contacts = value.get("contacts", [{}])
            to_phone = contacts[0].get("wa_id", "") if contacts else ""
            
            return WhatsAppMessage(
                from_phone=from_phone,
                to_phone=to_phone,
                message_id=message_id,
                content=content,
                timestamp=datetime.fromtimestamp(timestamp),
                message_type=message_type,
                media_url=media_url,
                metadata={"raw": msg_data}
            )
        
        except Exception as e:
            logger.error(f"Erro ao parsear webhook: {e}")
            return None
    
    async def get_contact_info(self, phone_number: str) -> Optional[WhatsAppContact]:
        """Obtém informações de contato do WhatsApp"""
        
        try:
            # Nota: Isto é uma simulação, a API real requer endpoint diferente
            # Implementar conforme documentação do WhatsApp Business API
            
            logger.info(f"Obtendo informações de {phone_number}")
            
            return WhatsAppContact(
                phone=phone_number,
                name="Unknown",  # Seria obtido da API real
            )
        
        except Exception as e:
            logger.error(f"Erro ao obter informações de contato: {e}")
            return None


# Router para webhooks
whatsapp_router = APIRouter(prefix="/webhooks", tags=["webhooks"])


@whatsapp_router.post("/whatsapp")
async def whatsapp_webhook(request: Request):
    """
    Webhook para receber mensagens do WhatsApp
    Validar token e processar mensagem
    """
    from src_py.config import settings
    
    # Validar webhook token
    data = await request.json()
    
    # POST request: validar token
    if request.method == "POST":
        try:
            gateway = WhatsAppGateway(
                settings.WHATSAPP_BUSINESS_ACCOUNT_ID,
                settings.WHATSAPP_ACCESS_TOKEN,
                settings.WHATSAPP_WEBHOOK_TOKEN,
            )
            
            msg = gateway.parse_webhook_message(data)
            
            if msg:
                logger.info(f"Mensagem recebida de {msg.from_phone}: {msg.content}")
                
                # Marcar como lida
                await gateway.mark_as_read(msg.message_id)
                
                from src_py.config.database import SessionLocal
                from src_py.demo_chatbot import process_demo_chat

                db = SessionLocal()
                try:
                    result = process_demo_chat(
                        db=db,
                        phone=msg.from_phone,
                        name=msg.from_phone,
                        content=msg.content,
                    )
                    if settings.WHATSAPP_ACCESS_TOKEN and settings.WHATSAPP_BUSINESS_ACCOUNT_ID:
                        await gateway.send_message(msg.from_phone, result.reply)
                    return {
                        "status": "received",
                        "conversation_id": result.conversation.id,
                        "queue_item_id": result.queue_item_id,
                        "reply": result.reply,
                    }
                finally:
                    db.close()
            
            return {"status": "no_message"}
        
        except Exception as e:
            logger.error(f"Erro processando webhook: {e}")
            raise HTTPException(status_code=500, detail=str(e))
    
    return {"status": "ok"}


@whatsapp_router.get("/whatsapp")
async def whatsapp_webhook_verify(request: Request):
    """
    Verificação do webhook pelo WhatsApp
    """
    from src_py.config import settings
    
    # GET request: verificar webhook
    verify_token = request.query_params.get("hub.verify_token")
    challenge = request.query_params.get("hub.challenge")
    
    if verify_token == settings.WHATSAPP_WEBHOOK_TOKEN:
        return challenge
    
    raise HTTPException(status_code=403, detail="Invalid verify token")


# Funções auxiliares
async def send_whatsapp_message(
    gateway: WhatsAppGateway,
    phone: str,
    message: str,
) -> bool:
    """Envia mensagem via WhatsApp"""
    return await gateway.send_message(phone, message, message_type="text")


async def send_whatsapp_welcome(
    gateway: WhatsAppGateway,
    phone: str,
    customer_name: str,
) -> bool:
    """Envia mensagem de boas-vindas"""
    message = f"Olá {customer_name}! Bem-vindo ao nosso atendimento. Como podemos ajudar?"
    return await gateway.send_message(phone, message, message_type="text")
