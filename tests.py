"""
Testes básicos para os serviços
Pytest configuration file
"""
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
import tempfile
import os

from src_py.database.models import Base
from src_py.config.settings import Settings


# ============ Fixtures ============

@pytest.fixture(scope="function")
def test_db() -> Session:
    """Cria banco de dados de teste em memória"""
    
    # Usar SQLite em memória para testes
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False}
    )
    
    # Criar tabelas
    Base.metadata.create_all(bind=engine)
    
    # Criar session
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    session = TestingSessionLocal()
    
    yield session
    
    session.close()


@pytest.fixture(scope="function")
def test_settings() -> Settings:
    """Cria settings de teste"""
    return Settings(
        DATABASE_URL="sqlite:///:memory:",
        SECRET_KEY="test-secret-key",
        OPENAI_API_KEY="test-key",
        DEBUG=True,
    )


# ============ Testes de Serviços ============

class TestUserService:
    """Testes para UserService"""
    
    def test_create_user(self, test_db):
        """Testa criação de usuário"""
        from src_py.services import get_user_service
        
        service = get_user_service(test_db)
        
        user = service.create_user(
            username="testuser",
            password="password123",
            email="test@example.com"
        )
        
        assert user.username == "testuser"
        assert user.email == "test@example.com"
        assert user.id is not None
    
    def test_authenticate_user(self, test_db):
        """Testa autenticação de usuário"""
        from src_py.services import get_user_service
        
        service = get_user_service(test_db)
        
        # Criar usuário
        service.create_user("testuser", "password123", "test@example.com")
        
        # Tentar autenticar com senha correta
        user = service.authenticate("testuser", "password123")
        assert user is not None
        assert user.username == "testuser"
        
        # Tentar autenticar com senha incorreta
        user = service.authenticate("testuser", "wrongpassword")
        assert user is None


class TestContactService:
    """Testes para ContactService"""
    
    def test_create_contact(self, test_db):
        """Testa criação de contato"""
        from src_py.services import get_contact_service
        
        service = get_contact_service(test_db)
        
        contact = service.create_contact(
            phone="+5511987654321",
            name="João Silva",
            email="joao@example.com"
        )
        
        assert contact.phone == "+5511987654321"
        assert contact.name == "João Silva"
        assert contact.id is not None
    
    def test_get_contact_by_phone(self, test_db):
        """Testa obter contato por telefone"""
        from src_py.services import get_contact_service
        
        service = get_contact_service(test_db)
        
        # Criar contato
        created = service.create_contact("+5511987654321", "João Silva")
        
        # Obter contato
        contact = service.get_contact_by_phone("+5511987654321")
        
        assert contact is not None
        assert contact.id == created.id
        assert contact.name == "João Silva"
    
    def test_get_or_create_contact(self, test_db):
        """Testa get_or_create (deve retornar existente ou criar)"""
        from src_py.services import get_contact_service
        
        service = get_contact_service(test_db)
        
        # Primeira chamada deve criar
        contact1 = service.get_or_create_contact("+5511987654321", "João Silva")
        assert contact1.id is not None
        
        # Segunda chamada deve retornar o mesmo
        contact2 = service.get_or_create_contact("+5511987654321", "Outro Nome")
        assert contact2.id == contact1.id


class TestConversationService:
    """Testes para ConversationService"""
    
    def test_create_conversation(self, test_db):
        """Testa criação de conversa"""
        from src_py.services import get_contact_service, get_conversation_service
        
        # Criar contato primeiro
        contact_service = get_contact_service(test_db)
        contact = contact_service.create_contact("+5511987654321", "João Silva")
        
        # Criar conversa
        conv_service = get_conversation_service(test_db)
        conversation = conv_service.create_conversation(
            contact_id=contact.id,
            title="Teste de conversa"
        )
        
        assert conversation.contact_id == contact.id
        assert conversation.status == "open"
        assert conversation.title == "Teste de conversa"
    
    def test_get_active_conversation(self, test_db):
        """Testa obter conversa ativa"""
        from src_py.services import get_contact_service, get_conversation_service
        
        # Setup
        contact_service = get_contact_service(test_db)
        contact = contact_service.create_contact("+5511987654321", "João Silva")
        
        conv_service = get_conversation_service(test_db)
        created = conv_service.create_conversation(contact_id=contact.id)
        
        # Obter conversa ativa
        active = conv_service.get_active_by_contact(contact.id)
        
        assert active is not None
        assert active.id == created.id
        assert active.status == "open"


class TestQueueService:
    """Testes para QueueService"""
    
    def test_create_queue(self, test_db):
        """Testa criação de fila"""
        from src_py.services import get_queue_service
        
        service = get_queue_service(test_db)
        
        queue = service.create_queue(
            name="suporte",
            description="Fila de suporte",
            priority=10
        )
        
        assert queue.name == "suporte"
        assert queue.priority == 10
        assert queue.is_active == True
    
    def test_add_to_queue(self, test_db):
        """Testa adicionar conversa à fila"""
        from src_py.services import (
            get_queue_service, get_contact_service, get_conversation_service
        )
        
        # Setup
        contact_service = get_contact_service(test_db)
        contact = contact_service.create_contact("+5511987654321", "João Silva")
        
        conv_service = get_conversation_service(test_db)
        conversation = conv_service.create_conversation(contact_id=contact.id)
        
        queue_service = get_queue_service(test_db)
        queue = queue_service.create_queue("test_queue")
        
        # Adicionar à fila
        item_id = queue_service.add_to_queue(queue.id, conversation.id)
        
        assert item_id is not None
        
        # Verificar que a conversa está na fila
        next_item = queue_service.get_next_in_queue(queue.id)
        assert next_item is not None
        assert next_item.conversation_id == conversation.id


# ============ Testes de Repositórios ============

class TestUserRepository:
    """Testes para UserRepository"""
    
    def test_create_and_retrieve(self, test_db):
        """Testa criar e recuperar usuário"""
        from src_py.repositories import UserRepository
        
        repo = UserRepository(test_db)
        
        # Criar
        user = repo.create("testuser", "test@example.com", "password123")
        assert user.id is not None
        
        # Recuperar
        retrieved = repo.get_by_id(user.id)
        assert retrieved.username == "testuser"
        assert retrieved.email == "test@example.com"


class TestMessageRepository:
    """Testes para MessageRepository"""
    
    def test_create_message(self, test_db):
        """Testa criar mensagem"""
        from src_py.repositories import MessageRepository, ContactRepository, ConversationRepository
        
        # Setup
        contact_repo = ContactRepository(test_db)
        contact = contact_repo.create("+5511987654321", "João")
        
        conv_repo = ConversationRepository(test_db)
        conversation = conv_repo.create(contact.id)
        
        # Criar mensagem
        msg_repo = MessageRepository(test_db)
        message = msg_repo.create(
            conversation_id=conversation.id,
            contact_id=contact.id,
            content="Teste",
            sender_type="user"
        )
        
        assert message.content == "Teste"
        assert message.sender_type == "user"
        assert message.conversation_id == conversation.id


# ============ Testes de Autenticação ============

class TestAuthentication:
    """Testes para autenticação"""
    
    def test_hash_password(self):
        """Testa hash de senha"""
        from src_py.auth import hash_password, verify_password
        
        password = "mypassword123"
        hashed = hash_password(password)
        
        assert hashed != password
        assert verify_password(password, hashed) == True
        assert verify_password("wrongpassword", hashed) == False
    
    def test_create_token(self):
        """Testa criação de token JWT"""
        from src_py.auth import create_access_token, decode_token
        
        data = {"sub": "123", "username": "testuser"}
        token = create_access_token(data)
        
        assert token is not None
        
        decoded = decode_token(token)
        assert decoded is not None
        assert decoded.get("sub") == "123"
        assert decoded.get("username") == "testuser"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
