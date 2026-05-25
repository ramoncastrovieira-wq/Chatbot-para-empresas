"""
ARQUITETURA DO SISTEMA - Diagrama Visual
Chatbot para Empresas v2.0.0 (Python)
"""

# ============ CAMADAS DA APLICAÇÃO ============

"""
┌─────────────────────────────────────────────────────────────┐
│                    APRESENTAÇÃO (HTTP)                       │
│  FastAPI Server (http://localhost:8000)                      │
│  - Swagger UI (/docs)                                        │
│  - ReDoc (/redoc)                                            │
│  - OpenAPI spec (/openapi.json)                              │
└────────────────────────────┬────────────────────────────────┘
                             │
┌────────────────────────────┴────────────────────────────────┐
│                    CAMADA DE ROTAS (API)                     │
│  routes.py - 20+ Endpoints FastAPI                           │
│  ├── /api/v1/auth/                                           │
│  ├── /api/v1/contacts/                                       │
│  ├── /api/v1/conversations/                                  │
│  ├── /api/v1/messages/                                       │
│  ├── /api/v1/queues/                                         │
│  ├── /api/v1/health/                                         │
│  └── /webhooks/whatsapp/                                     │
└────────────────────────────┬────────────────────────────────┘
                             │
        ┌────────────────────┼────────────────────┐
        │                    │                    │
        ▼                    ▼                    ▼
┌──────────────────┐ ┌──────────────┐ ┌─────────────────┐
│  AUTENTICAÇÃO    │ │  VALIDAÇÃO   │ │  AUTORIZAÇÃO    │
│  auth.py         │ │  schemas.py  │ │  (middleware)   │
│                  │ │              │ │                 │
│  - JWT token     │ │  - Pydantic  │ │  - Roles        │
│  - Hash password │ │  - DTOs      │ │  - Permissions  │
│  - Verify token  │ │  - Schemas   │ │                 │
└──────────────────┘ └──────────────┘ └─────────────────┘
        │                    │                    │
        └────────────────────┼────────────────────┘
                             │
┌────────────────────────────┴────────────────────────────────┐
│                CAMADA DE SERVIÇOS (BUSINESS LOGIC)           │
│  services.py - 5 Services (Orquestração)                     │
│  ├── UserService                                             │
│  ├── ContactService                                          │
│  ├── ConversationService                                     │
│  ├── MessageService     ◄────┐                              │
│  └── QueueService             │ Processa com IA              │
│                               │                              │
└────────────────────────────┬──┴──────────────────────────────┘
                             │
        ┌────────────────────┼────────────────────┐
        │                    ▼                    │
        │         ┌──────────────────────┐        │
        │         │  AI FLOWS            │        │
        │         │  ai_flows/           │        │
        │         │                      │        │
        │         │  AIFlowsManager +    │        │
        │         │  LangGraph           │        │
        │         │                      │        │
        │         │  [4 Custom Chains]   │        │
        │         └──────────┬───────────┘        │
        │                    │                    │
        │                    ▼                    │
        │         ┌──────────────────────┐        │
        │         │  LLM (OpenAI)        │        │
        │         │  gpt-3.5-turbo       │        │
        │         │  + LangChain         │        │
        │         └──────────────────────┘        │
        │                    │                    │
        └────────────────────┼────────────────────┘
                             │
┌────────────────────────────┴────────────────────────────────┐
│               CAMADA DE REPOSITÓRIOS (DATA ACCESS)           │
│  repositories.py - 6 Repositories (DAO)                      │
│  ├── UserRepository                                          │
│  ├── ContactRepository                                       │
│  ├── ConversationRepository                                  │
│  ├── MessageRepository                                       │
│  ├── QueueRepository                                         │
│  └── QueueItemRepository                                     │
└────────────────────────────┬────────────────────────────────┘
                             │
┌────────────────────────────┴────────────────────────────────┐
│                  CAMADA DE MODELOS (ORM)                     │
│  database/models.py - 8 SQLAlchemy Models                    │
│  ├── User                                                    │
│  ├── Attendant                                               │
│  ├── Contact                                                 │
│  ├── Conversation                                            │
│  ├── Message                                                 │
│  ├── Queue                                                   │
│  ├── QueueItem                                               │
│  └── UserRole (Enum)                                         │
└────────────────────────────┬────────────────────────────────┘
                             │
┌────────────────────────────┴────────────────────────────────┐
│                  CAMADA DE BANCO DE DADOS                    │
│  SQLAlchemy ORM ◄────────────────────┐                      │
│  config/database.py                  │                      │
│  ├── SessionLocal (Síncrono)         │                      │
│  ├── AsyncSessionLocal (Assíncrono)  │                      │
│  └── Engine + Connection Pool        │                      │
└────────────────────────────┬────────────────────────────────┘
                             │
                    ┌────────┴─────────┐
                    │                  │
                    ▼                  ▼
            ┌──────────────┐   ┌─────────────────┐
            │  PostgreSQL  │   │  Integração     │
            │              │   │  WhatsApp       │
            │  - 7 Tables  │   │  (Cloud API)    │
            │  - 20+ Cols  │   │                 │
            │  - Indexes   │   │  - Webhooks     │
            │  - Cascades  │   │  - Send/Receive │
            └──────────────┘   └─────────────────┘
"""

# ============ FLUXO DE PROCESSAMENTO DE MENSAGEM ============

"""
┌─────────────────────┐
│  WhatsApp ou API    │
│  /api/v1/messages   │
└──────────────┬──────┘
               │
               ▼
         ┌─────────────┐
         │  Validação  │
         │  (Pydantic) │
         └──────┬──────┘
                │ (DTOs válidos)
                ▼
         ┌──────────────────┐
         │  MessageService  │
         │  .process_       │
         │  incoming_       │
         │  message()       │
         └──────┬───────────┘
                │
         ┌──────┴──────────────────────────┐
         │                                 │
         ▼                                 ▼
    ┌─────────────────┐            ┌──────────────────┐
    │  1. Salvar      │            │  2. Recuperar    │
    │  mensagem       │            │  histórico       │
    │  do usuário     │            │  (últimas 10)    │
    └────────┬────────┘            └────────┬─────────┘
             │                              │
             └──────────────┬───────────────┘
                            │
                    ┌───────▼────────────────┐
                    │ 3. AIFlowsManager      │
                    │    .process_           │
                    │    conversation()      │
                    │                        │
                    │ Processa via grafo:    │
                    └───────┬────────────────┘
                            │
            ┌───────────────┼───────────────┐
            │               │               │
            ▼               ▼               ▼
    ┌─────────────┐  ┌─────────────┐ ┌──────────────┐
    │  1. Process │  │  2. Route   │ │  3. Generate │
    │  Message    │  │  Intent     │ │  Response    │
    │             │  │             │ │              │
    │ Normaliza   │  │ Detecta:    │ │ Chamar LLM   │
    │ entrada     │  │ - product   │ │ (GPT-3.5)    │
    │             │  │ - support   │ │              │
    │             │  │ - order     │ │ Retorna:     │
    │             │  │ - greeting  │ │ String texto │
    └─────────────┘  │ - other     │ └──────────────┘
                     └─────────────┘
                            │
                    ┌───────▼────────┐
                    │  4. Save       │
                    │  Interaction   │
                    │                │
                    │  Marca para    │
                    │  salvar no BD  │
                    └───────┬────────┘
                            │
                    ┌───────▼──────────┐
                    │  Salvar resposta │
                    │  da IA no BD     │
                    └───────┬──────────┘
                            │
                    ┌───────▼──────────┐
                    │  Retornar        │
                    │  resposta para   │
                    │  usuário         │
                    └──────────────────┘
"""

# ============ ESTRUTURA DE DADOS NO BANCO ============

"""
┌─────────────────────────────────────────────────────────────┐
│                    SCHEMA DO BANCO                           │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  users                                                       │
│  ├── id (PK)                                                 │
│  ├── username (UNIQUE)                                       │
│  ├── email (UNIQUE)                                          │
│  ├── hashed_password                                         │
│  ├── role (user|attendant|admin)                             │
│  ├── is_active                                               │
│  ├── created_at ◄──┐                                         │
│  └── updated_at    │  auto timestamps                        │
│                    │                                         │
│  attendants        │ Relacionamento:                         │
│  ├── id (PK)       │ attendants.user_id ─────→ users.id     │
│  ├── user_id (FK)  ◄──┘                                      │
│  ├── name                                                    │
│  ├── description                                             │
│  ├── is_active                                               │
│  ├── created_at                                              │
│  └── updated_at                                              │
│                                                              │
│  contacts                                                    │
│  ├── id (PK)                                                 │
│  ├── phone (UNIQUE)           ┐                              │
│  ├── name                      ├─ info básica               │
│  ├── email                     │                             │
│  ├── metadata (JSON)           ┘ custom fields              │
│  ├── is_active                                               │
│  ├── created_at                                              │
│  └── updated_at                                              │
│      │                                                       │
│      └─ 1:N ─→ conversations                                 │
│      └─ 1:N ─→ messages                                      │
│                                                              │
│  conversations                                               │
│  ├── id (PK)                                                 │
│  ├── contact_id (FK) ◄─ de qual contato?                    │
│  ├── attendant_id (FK) ◄─ atendente responsável             │
│  ├── assigned_attendant_id (FK) ◄─ usuário que atende      │
│  ├── title                                                   │
│  ├── status (open|closed|waiting)                            │
│  ├── metadata (JSON)                                         │
│  ├── created_at                                              │
│  ├── updated_at                                              │
│  │                                                           │
│  └─ 1:N ─→ messages                                          │
│  └─ 1:N ─→ queue_items                                       │
│                                                              │
│  messages                                                    │
│  ├── id (PK)                                                 │
│  ├── conversation_id (FK)                                    │
│  ├── contact_id (FK)                                         │
│  ├── sender_type (user|bot|attendant)                        │
│  ├── content (TEXT)           ┐                              │
│  ├── message_type (text|image|audio|file) ┤ conteúdo        │
│  ├── external_id (ex: ID WhatsApp)  ┘                        │
│  ├── metadata (JSON)                                         │
│  ├── created_at                                              │
│  └── updated_at                                              │
│                                                              │
│  queues                                                      │
│  ├── id (PK)                                                 │
│  ├── name (UNIQUE)                                           │
│  ├── description                                             │
│  ├── priority                                                │
│  ├── is_active                                               │
│  ├── created_at                                              │
│  ├── updated_at                                              │
│  │                                                           │
│  └─ 1:N ─→ queue_items                                       │
│                                                              │
│  queue_items                                                 │
│  ├── id (PK)                                                 │
│  ├── queue_id (FK)                                           │
│  ├── conversation_id (FK)                                    │
│  ├── position (ordem na fila)                                │
│  ├── status (waiting|processing|completed)                   │
│  ├── created_at                                              │
│  └── updated_at                                              │
│                                                              │
└─────────────────────────────────────────────────────────────┘
"""

# ============ GRAFO DE FLUXO AI (LANGGRAPH) ============

"""
                              ┌──────────────────────┐
                              │ ConversationState    │
                              ├──────────────────────┤
                              │ - messages[]         │
                              │ - conversation_id    │
                              │ - contact_phone      │
                              │ - contact_name       │
                              │ - metadata{}         │
                              │ - status             │
                              └──────────────────────┘
                                       │
                                       ▼
                              ┌─────────────────┐
                         ┌─→ │ 1. Process      │ ◄──┐
                         │   │ Message         │    │
                         │   │                 │    │
                         │   │ Normaliza       │    │
                         │   │ entrada         │    │
                         │   └────────┬────────┘    │
                         │            │             │
                         │            ▼             │
                         │   ┌─────────────────┐    │
                         │   │ 2. Route        │    │
                         │   │ Intent          │    │
                         │   │                 │    │
                         │   │ Detecta tipo    │    │
                         │   │ de pergunta     │    │
                         │   └────────┬────────┘    │
                         │            │             │
                         │            ▼             │
                         │   ┌──────────────────┐   │
                         │   │ 3. Generate      │   │
                         │   │ Response         │   │
                         │   │                  │   │
                         │   │ Chamar OpenAI    │   │
                         │   │ + LangChain      │   │
                         │   │ (GPT-3.5-turbo)  │   │
                         │   └────────┬─────────┘   │
                         │            │             │
                         │            ▼             │
                         │   ┌─────────────────┐    │
                         │   │ 4. Save         │    │
                         │   │ Interaction     │    │
                         │   │                 │    │
                         │   │ Marca para      │    │
                         │   │ salvar BD       │    │
                         │   └────────┬────────┘    │
                         │            │             │
                         └────────────┴─────────────┘
                                      │
                                      ▼
                              [END - Retorna Estado]
"""

# ============ STACK DE TECNOLOGIA ============

"""
┌─────────────────────────────────────────────────┐
│              TECNOLOGIA STACK                    │
├─────────────────────────────────────────────────┤
│                                                  │
│ BACKEND                                          │
│ ├─ FastAPI 0.104       (Web Framework)          │
│ ├─ Uvicorn             (ASGI Server)            │
│ ├─ SQLAlchemy 2.0      (ORM)                    │
│ ├─ Pydantic 2.5        (Data Validation)        │
│ ├─ python-jose         (JWT)                    │
│ ├─ passlib+bcrypt      (Password Hashing)       │
│ └─ httpx               (Async HTTP Client)      │
│                                                  │
│ BANCO DE DADOS                                   │
│ ├─ PostgreSQL 12+      (RDBMS)                  │
│ ├─ psycopg2-binary     (DB Driver)              │
│ ├─ asyncpg (async)     (Async DB Driver)        │
│ └─ SQLAlchemy ORM      (Object Mapping)         │
│                                                  │
│ INTELIGÊNCIA ARTIFICIAL                          │
│ ├─ LangChain 0.1       (LLM Framework)          │
│ ├─ LangGraph 0.0.17    (Graph Orchestration)    │
│ ├─ langchain-openai    (OpenAI Integration)     │
│ ├─ langchain-community (Ecosystem)              │
│ └─ OpenAI API          (gpt-3.5-turbo)          │
│                                                  │
│ INTEGRAÇÃO                                       │
│ ├─ WhatsApp API        (Messaging)              │
│ ├─ httpx               (API Calls)              │
│ ├─ WebSockets (planned) (Real-time)             │
│ └─ aiohttp             (Async HTTP)             │
│                                                  │
│ DEPLOYMENT                                       │
│ ├─ Docker              (Containerization)       │
│ ├─ docker-compose      (Local Dev)              │
│ ├─ Kubernetes (planned) (Orchestration)         │
│ └─ Python 3.10+        (Runtime)                │
│                                                  │
│ DEVELOPMENT                                      │
│ ├─ pytest              (Testing)                │
│ ├─ black               (Code Formatting)        │
│ ├─ flake8              (Linting)                │
│ ├─ mypy                (Type Checking)          │
│ └─ Poetry              (Dependency Manager)     │
│                                                  │
└─────────────────────────────────────────────────┘
"""

print(__doc__)
