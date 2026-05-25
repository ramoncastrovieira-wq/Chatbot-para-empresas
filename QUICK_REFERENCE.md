"""
QUICK REFERENCE - Chatbot para Empresas (Python v2.0.0)
Guia de Referência Rápida para Desenvolvedores
"""

# ============ ESTRUTURA DO PROJETO ============
"""
src_py/
├── config/
│   ├── settings.py          # Configuração via environment variables
│   ├── database.py          # SQLAlchemy setup (sync + async)
│   └── __init__.py
│
├── database/
│   ├── models.py            # 8 modelos SQLAlchemy
│   └── __init__.py
│
├── ai_flows/
│   ├── manager.py           # AIFlowsManager + LangGraph
│   ├── chains.py            # 4 Custom Chains LangChain
│   └── __init__.py
│
├── schemas.py               # 13 Pydantic DTOs
├── repositories.py          # 6 Data Access Objects
├── services.py              # 5 Business Logic Services
├── auth.py                  # JWT + Password handling
├── routes.py                # 20+ FastAPI endpoints
├── integrations_whatsapp.py # WhatsApp Gateway
├── main.py                  # FastAPI Application
└── __init__.py

tests.py                      # Pytest suite
examples.py                   # 7 exemplos de uso
pyproject.toml               # Poetry config
requirements.txt             # pip dependencies
.env.example                 # Template de variáveis
"""

# ============ INICIAR PROJETO ============

"""
1. Clonar/Download
   cd projeto

2. Ambiente Virtual
   python -m venv venv
   venv\Scripts\activate  # Windows
   source venv/bin/activate  # Linux/macOS

3. Instalar Dependências
   pip install -r requirements.txt
   # Ou com Poetry
   poetry install

4. Configuração
   cp .env.example .env
   # Editar .env com variáveis corretas

5. Rodar Servidor
   uvicorn src_py.main:app --reload
   # Ou: python -m uvicorn src_py.main:app --reload

6. Acessar
   API: http://localhost:8000
   Docs: http://localhost:8000/docs
   ReDoc: http://localhost:8000/redoc
"""

# ============ VARIÁVEIS DE AMBIENTE (.env) ============

"""
# Servidor
DEBUG=False
HOST=0.0.0.0
PORT=8000
RELOAD=True

# Banco de Dados
DATABASE_URL=postgresql://user:password@localhost:5432/chatbot
ECHO_SQL=False

# JWT
SECRET_KEY=seu-super-secret-key-aqui
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# OpenAI (LLM)
OPENAI_API_KEY=sk-...
LLM_MODEL=gpt-3.5-turbo

# WhatsApp (opcional)
WHATSAPP_BUSINESS_ACCOUNT_ID=...
WHATSAPP_ACCESS_TOKEN=...
WHATSAPP_WEBHOOK_TOKEN=...

# CORS
BACKEND_CORS_ORIGINS=["http://localhost:3000","http://localhost:8000"]
"""

# ============ ENDPOINTS PRINCIPAIS ============

"""
AUTH
├── POST /api/v1/auth/register
│   Body: {"username", "password", "email", "role"}
│
├── POST /api/v1/auth/login
│   Body: {"username", "password"}
│   Return: {"access_token", "token_type", "user"}
│
└── GET /api/v1/auth/me
    Headers: Authorization: Bearer <token>

CONTACTS
├── POST /api/v1/contacts
│   Body: {"name", "phone", "email", "metadata"}
│
├── GET /api/v1/contacts
│   Params: skip=0, limit=100
│
└── GET /api/v1/contacts/{contact_id}

CONVERSATIONS
├── POST /api/v1/conversations
│   Body: {"contact_id", "title", "metadata"}
│
├── GET /api/v1/conversations
│   Params: contact_id=?, status=?, skip=0, limit=100
│
├── GET /api/v1/conversations/{conversation_id}
│   Return: Conversa com histórico completo
│
├── PATCH /api/v1/conversations/{conversation_id}
│   Body: {"title", "status", "attendant_id"}
│
└── POST /api/v1/conversations/{conversation_id}/close

MESSAGES
├── POST /api/v1/messages (processa com IA!)
│   Body: {"conversation_id", "contact_id", "content"}
│
└── GET /api/v1/conversations/{conversation_id}/messages
    Params: limit=50

QUEUES
├── POST /api/v1/queues/{queue_id}/add/{conversation_id}
│
└── GET /api/v1/queues/{queue_id}/next

HEALTH
└── GET /api/v1/health
    Return: {"status", "version", "database"}
"""

# ============ USAR SERVIÇOS ============

"""
# Em um endpoint ou serviço:

from sqlalchemy.orm import Session
from src_py.config import get_db
from src_py.services import (
    get_user_service,
    get_contact_service,
    get_conversation_service,
    get_message_service,
    get_queue_service
)

@app.post("/exemplo")
async def exemplo(db: Session = Depends(get_db)):
    # Usuários
    user_service = get_user_service(db)
    user = user_service.create_user("user", "pass", "email@example.com")
    user = user_service.authenticate("user", "pass")
    user = user_service.get_user(1)
    
    # Contatos
    contact_service = get_contact_service(db)
    contact = contact_service.create_contact("+5511999999999", "João")
    contact = contact_service.get_or_create_contact("+5511999999999", "João")
    
    # Conversas
    conv_service = get_conversation_service(db)
    conv = conv_service.create_conversation(contact_id=1, title="Teste")
    conv = conv_service.get_or_create_conversation(contact_id=1)
    conv = conv_service.close_conversation(conv_id=1)
    
    # Mensagens
    msg_service = get_message_service(db)
    response = await msg_service.process_incoming_message(
        conversation_id=1,
        contact_id=1,
        content="Sua pergunta aqui"
    )
    
    # Filas
    queue_service = get_queue_service(db)
    queue = queue_service.create_queue("suporte", priority=10)
    queue_item_id = queue_service.add_to_queue(queue_id=1, conversation_id=1)
    next_item = queue_service.get_next_in_queue(queue_id=1)
    
    return {"status": "ok"}
"""

# ============ USAR AI FLOWS ============

"""
# Processar mensagem com IA (LangChain + LangGraph):

import asyncio
from src_py.services import get_message_service
from src_py.config import get_db_context

async def main():
    with get_db_context() as db:
        msg_service = get_message_service(db)
        
        response = await msg_service.process_incoming_message(
            conversation_id=1,
            contact_id=1,
            content="Qual é o preço do pneu XYZ?"
        )
        
        print(f"Resposta: {response}")

asyncio.run(main())

# Fluxo interno:
# 1. Mensagem armazenada no banco
# 2. Histórico recuperado
# 3. Processado no grafo de IA:
#    a. process_message (normalização)
#    b. route_intent (detecta intenção)
#    c. generate_response (gera com LLM)
#    d. save_interaction (marca para salvar)
# 4. Resposta retornada
"""

# ============ CUSTOM CHAINS ============

"""
from langchain.chat_models import ChatOpenAI
from src_py.ai_flows import (
    ProductRecommendationChain,
    SupportTicketAnalyzerChain,
    ConversationSummarizerChain,
    HandoffEvaluatorChain
)
from src_py.config import settings

async def exemplo_chains():
    llm = ChatOpenAI(
        model_name=settings.LLM_MODEL,
        api_key=settings.OPENAI_API_KEY
    )
    
    # 1. Recomendar produtos
    rec_chain = ProductRecommendationChain(llm)
    recommendation = await rec_chain.recommend(
        customer_need="Pneus para SUV",
        purchase_history="Comprou Michelin antes",
        budget="R$ 3000"
    )
    print(recommendation)
    
    # 2. Analisar ticket
    ticket_chain = SupportTicketAnalyzerChain(llm)
    analysis = await ticket_chain.analyze(
        "Meu pneu vazou e não consigo trocar"
    )
    print(analysis)
    # Output: {"issue_type", "severity", "suggested_solution", "requires_escalation"}
    
    # 3. Sumarizar conversa
    summary_chain = ConversationSummarizerChain(llm)
    summary = await summary_chain.summarize(conversation_text)
    print(summary)
    
    # 4. Avaliar handoff (transferência para humano)
    handoff_chain = HandoffEvaluatorChain(llm)
    result = await handoff_chain.evaluate(
        message="Não consegui resolver",
        history="3 tentativas anteriores",
        previous_attempts="Recomendações e FAQ"
    )
    print(result)
    # Output: {"should_handoff": true/false, "reason", "department", "urgency"}
"""

# ============ TESTES ============

"""
# Rodar testes
pytest tests.py

# Com verbose
pytest tests.py -v

# Com cobertura
pytest tests.py --cov=src_py

# Teste específico
pytest tests.py::TestUserService::test_create_user -v

# Classes de teste disponíveis:
- TestUserService
- TestContactService
- TestConversationService
- TestQueueService
- TestUserRepository
- TestMessageRepository
- TestAuthentication
"""

# ============ EXEMPLOS ============

"""
# Rodar exemplos
python examples.py

# Exemplos disponíveis:
1. example_1_create_user()
2. example_2_create_contact_and_conversation()
3. example_3_process_message_with_ai()
4. example_4_ai_flow_with_langgraph()
5. example_5_custom_chains()
6. example_6_queue_management()
7. example_7_list_conversations()

# Alguns requerem:
- PostgreSQL rodando
- OPENAI_API_KEY configurada
"""

# ============ DEBUGGING ============

"""
# Ativar logging detalhado
import logging
logging.basicConfig(level=logging.DEBUG)

# Conectar ao banco de dados
from sqlalchemy import inspect
from src_py.config import engine

inspector = inspect(engine)
print(inspector.get_table_names())

# Executar query raw
from src_py.config import get_db_context

with get_db_context() as db:
    result = db.execute("SELECT * FROM users")
    for row in result:
        print(row)

# Verificar modelos
from src_py.database import Base
print([mapper.class_ for mapper in Base.registry.mappers])
"""

# ============ DEPLOY ============

"""
# Local (desenvolvimento)
uvicorn src_py.main:app --reload --port 8000

# Production
uvicorn src_py.main:app --host 0.0.0.0 --port 8000 --workers 4

# Docker
docker build -t chatbot-python .
docker run -p 8000:8000 \
  -e DATABASE_URL="postgresql://..." \
  -e OPENAI_API_KEY="sk-..." \
  -e SECRET_KEY="..." \
  chatbot-python

# Environment variables necessárias:
DATABASE_URL
OPENAI_API_KEY
SECRET_KEY
"""

# ============ TROUBLESHOOTING ============

"""
ERRO: "ModuleNotFoundError: No module named 'src_py'"
SOLUÇÃO: Execute da raiz do projeto
python -m uvicorn src_py.main:app --reload

ERRO: "psycopg2: could not translate host name"
SOLUÇÃO: Verificar DATABASE_URL
postgresql://user:password@localhost:5432/database

ERRO: "OPENAI_API_KEY not set"
SOLUÇÃO: Configurar variável de ambiente
export OPENAI_API_KEY="sk-..."

ERRO: "Connection refused" (PostgreSQL)
SOLUÇÃO: Verificar se PostgreSQL está rodando
Windows: services.msc → PostgreSQL
Linux: sudo service postgresql status
macOS: brew services list

ERRO: "401 Unauthorized" em endpoints protegidos
SOLUÇÃO: Incluir token JWT no header
Authorization: Bearer <token>

ERRO: "422 Validation Error"
SOLUÇÃO: Verificar schema Pydantic em /docs
Ou verificar body enviado vs schema esperado
"""

# ============ ARQUIVOS DE REFERÊNCIA ============

"""
📖 Documentação:
- MIGRATION_GUIDE.md       - Guia completo de migração
- README_PYTHON.md         - README do projeto
- MIGRATION_SUMMARY.md     - Sumário técnico
- .env.example             - Template de variáveis

💻 Código:
- examples.py              - 7 exemplos práticos
- tests.py                 - Testes Pytest
- src_py/routes.py         - Todos os endpoints

🔧 Configuração:
- pyproject.toml           - Poetry config
- requirements.txt         - Pip dependencies
- .env                     - Variáveis de ambiente (criar)

📚 API:
- http://localhost:8000/docs       - Swagger UI
- http://localhost:8000/redoc      - ReDoc
- http://localhost:8000/openapi.json - OpenAPI spec
"""

# ============ RECURSOS ÚTEIS ============

"""
🌐 Documentação Online:
- FastAPI: https://fastapi.tiangolo.com/
- LangChain: https://python.langchain.com/
- LangGraph: https://langchain-ai.github.io/langgraph/
- SQLAlchemy: https://docs.sqlalchemy.org/
- Pydantic: https://docs.pydantic.dev/
- PostgreSQL: https://www.postgresql.org/docs/

🛠️ Ferramentas:
- VS Code
- Postman ou Insomnia (testar API)
- pgAdmin (gerenciar PostgreSQL)
- DBeaver (visualizar banco)

📚 Cursos:
- FastAPI crash course
- LangChain for LLM app development
- SQLAlchemy ORM tutorial
- Python async/await
"""

# ============ QUICK COMMANDS ============

"""
# Instalar dependências
pip install -r requirements.txt

# Criar banco de dados
createdb -U postgres chatbot_db

# Rodar servidor
uvicorn src_py.main:app --reload

# Testar API
curl http://localhost:8000/api/v1/health

# Ver logs
tail -f logs.txt

# Resetar banco (CUIDADO!)
dropdb -U postgres chatbot_db
createdb -U postgres chatbot_db

# Format código
black src_py/

# Lint
flake8 src_py/

# Type checking
mypy src_py/

# Rodar testes
pytest tests.py -v

# Rodar exemplos
python examples.py
"""

print(__doc__)
