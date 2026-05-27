# Migração para Python - Chatbot para Empresas v2.0.0

## 📋 Visão Geral

Este projeto foi migrado de uma arquitetura TypeScript/Node.js (Express) para Python 3.10+ com integração de IA avançada usando:

- **FastAPI**: Framework web moderno e rápido
- **SQLAlchemy**: ORM poderoso para banco de dados
- **LangChain**: Framework para aplicações com LLMs
- **LangGraph**: Orquestração de grafos de fluxo de IA
- **PostgreSQL**: Banco de dados robusto
- **Pydantic**: Validação de dados

## 🎯 Principais Mudanças Arquiteturais

### De TypeScript/Node.js para Python

| Aspecto | Antes (Node.js) | Agora (Python) |
|--------|----------------|----|
| Framework HTTP | Express | FastAPI |
| Database | pg + Scripts | SQLAlchemy + Alembic |
| Autenticação | jsonwebtoken (JWT) | python-jose + passlib |
| IA/LLM | - | LangChain + LangGraph |
| Validação | Middleware customizado | Pydantic |
| Segurança | bcryptjs | bcrypt (passlib) |
| WebSocket | socket.io | WebSockets (FastAPI) |

### Estrutura de Pastas

```
projeto/
├── src_py/                    # Nova estrutura Python
│   ├── config/               # Configurações
│   │   ├── settings.py       # Variáveis de ambiente
│   │   ├── database.py       # Conexão PostgreSQL
│   │   └── __init__.py
│   ├── database/             # Camada de dados
│   │   ├── models.py         # Modelos SQLAlchemy
│   │   └── __init__.py
│   ├── ai_flows/             # Fluxos de IA com LangChain/LangGraph
│   │   ├── manager.py        # Orquestrador principal
│   │   ├── chains.py         # Chains customizadas
│   │   └── __init__.py
│   ├── schemas.py            # Pydantic DTOs
│   ├── repositories.py       # Data Access Layer
│   ├── services.py           # Business Logic Layer
│   ├── auth.py              # Autenticação JWT
│   ├── routes.py            # Endpoints da API
│   ├── main.py              # Aplicação FastAPI
│   └── __init__.py
├── pyproject.toml           # Configuração Poetry
├── requirements.txt         # Dependências pip
├── .env.example            # Variáveis de ambiente exemplo
└── MIGRATION_GUIDE.md      # Este arquivo
```

## 🚀 Quick Start

### 1. Requisitos
- Python 3.10 ou superior
- PostgreSQL 12+
- pip ou Poetry

### 2. Instalação

#### Opção A: Com Poetry (Recomendado)
```bash
# Instalar Poetry (se não tiver)
curl -sSL https://install.python-poetry.org | python3 -

# Instalar dependências
poetry install

# Ativar ambiente virtual
poetry shell
```

#### Opção B: Com pip
```bash
# Criar ambiente virtual
python -m venv venv

# Ativar (Windows)
venv\Scripts\activate

# Ativar (Linux/macOS)
source venv/bin/activate

# Instalar dependências
pip install -r requirements.txt
```

### 3. Configuração do Banco de Dados

```bash
# Windows PowerShell
$env:DATABASE_URL = "postgresql://user:password@localhost:5432/chatbot"

# Linux/macOS
export DATABASE_URL="postgresql://user:password@localhost:5432/chatbot"
```

Ou crie um arquivo `.env`:
```bash
cp .env.example .env
# Edite .env com suas variáveis
```

### 4. OpenAI API Key

```bash
# Windows PowerShell
$env:OPENAI_API_KEY = "sk-..."

# Linux/macOS
export OPENAI_API_KEY="sk-..."
```

Ou adicione ao `.env`:
```
OPENAI_API_KEY=sk-...
```

### 5. Iniciar o Servidor

```bash
# Com Poetry
poetry run python -m src_py.main

# Ou diretamente
python -m uvicorn src_py.main:app --reload

# Ou com Poetry
poetry run uvicorn src_py.main:app --reload --port 8000
```

A API estará disponível em: `http://localhost:8000`
Documentação Swagger: `http://localhost:8000/docs`
Documentação ReDoc: `http://localhost:8000/redoc`

## 📚 API Endpoints

### Autenticação
```bash
# Registrar
POST /api/v1/auth/register
{
  "username": "user",
  "password": "password",
  "email": "user@example.com",
  "role": "user"
}

# Login
POST /api/v1/auth/login
{
  "username": "user",
  "password": "password"
}

# Obter informações do usuário
GET /api/v1/auth/me
Authorization: Bearer <token>
```

### Contatos
```bash
# Criar contato
POST /api/v1/contacts
{
  "name": "João Silva",
  "phone": "+5511999999999",
  "email": "joao@example.com"
}

# Listar contatos
GET /api/v1/contacts?skip=0&limit=100

# Obter contato
GET /api/v1/contacts/{contact_id}
```

### Conversas
```bash
# Criar conversa
POST /api/v1/conversations
{
  "contact_id": 1,
  "title": "Conversa com João"
}

# Obter conversa com histórico
GET /api/v1/conversations/{conversation_id}

# Listar conversas
GET /api/v1/conversations?contact_id=1&status=open

# Enviar mensagem (processa com IA)
POST /api/v1/messages
{
  "conversation_id": 1,
  "contact_id": 1,
  "content": "Qual é o preço da peça ABC-123?"
}

# Fechar conversa
POST /api/v1/conversations/{conversation_id}/close
```

### Filas
```bash
# Adicionar à fila
POST /api/v1/queues/{queue_id}/add/{conversation_id}

# Obter próxima conversa
GET /api/v1/queues/{queue_id}/next
```

## 🤖 Fluxos de IA com LangChain e LangGraph

### Arquitetura de Fluxo

O sistema utiliza **LangGraph** para orquestrar fluxos de conversa:

```
Mensagem Entrada
    ↓
[1] process_message → normalização
    ↓
[2] route_intent → detecta intenção (pergunta, suporte, etc)
    ↓
[3] generate_response → gera resposta com LLM (GPT-3.5)
    ↓
[4] save_interaction → salva no banco
    ↓
Resposta para usuário
```

### Chains Customizadas

O módulo `ai_flows/chains.py` fornece chains especializadas:

- **ProductRecommendationChain**: Recomenda produtos
- **SupportTicketAnalyzerChain**: Analisa tickets de suporte
- **ConversationSummarizerChain**: Sumariza conversas
- **HandoffEvaluatorChain**: Decide se precisa transferir para humano

### Exemplo de Uso

```python
from src_py.ai_flows import get_ai_manager, ConversationState

# Obter manager de IA
ai_manager = get_ai_manager()

# Criar estado
state = ConversationState(
    messages=[
        {"role": "user", "content": "Qual é o preço do pneu XYZ?"}
    ],
    conversation_id=1,
    contact_phone="+5511999999999",
    contact_name="João"
)

# Processar através do grafo
result = await ai_manager.process_conversation(state)

# Resultado contém resposta gerada
print(result.messages[-1]["content"])
```

## 🔄 Migrando Dados do Node.js

Se você tem dados no banco antigo:

```bash
# 1. Fazer backup do banco antigo
pg_dump -U user -d old_chatbot > backup.sql

# 2. Restaurar em novo banco (opcional)
# A migração será feita através dos modelos SQLAlchemy

# 3. Os modelos SQLAlchemy criарão as tabelas automaticamente
# Execute a aplicação uma vez para criar o schema
```

## 🧪 Testes

```bash
# Rodar testes
pytest

# Com cobertura
pytest --cov=src_py

# Modo verbose
pytest -v
```

## 📝 Variáveis de Ambiente

Todas as configurações estão em `src_py/config/settings.py`:

| Variável | Padrão | Descrição |
|----------|--------|----------|
| DEBUG | False | Modo debug |
| HOST | 0.0.0.0 | Host do servidor |
| PORT | 8000 | Porta do servidor |
| DATABASE_URL | - | String de conexão PostgreSQL |
| OPENAI_API_KEY | - | Chave da API OpenAI |
| LLM_MODEL | gpt-3.5-turbo | Modelo LLM a usar |
| SECRET_KEY | - | Chave secreta para JWT |
| ALGORITHM | HS256 | Algoritmo JWT |

## 🐛 Troubleshooting

### Erro: "No module named 'src_py'"
```bash
# Execute da raiz do projeto
python -m uvicorn src_py.main:app --reload
```

### Erro: "psycopg2: could not translate host name"
```bash
# Verifique DATABASE_URL
# Formato correto: postgresql://user:password@host:5432/database
```

### Erro: "OPENAI_API_KEY not set"
```bash
# Linux/macOS
export OPENAI_API_KEY="sk-..."

# Windows PowerShell
$env:OPENAI_API_KEY = "sk-..."
```

### ImportError com LangChain
```bash
# Atualizar dependências
pip install --upgrade langchain langchain-openai langgraph

# Ou com poetry
poetry update
```

## 📦 Dependências Principais

```
FastAPI==0.104.1          # Web framework
SQLAlchemy==2.0.23        # ORM
psycopg2-binary==2.9.9    # PostgreSQL driver
LangChain==0.1.0          # LLM framework
LangGraph==0.0.17         # Graph orchestration
OpenAI==0.27.0            # OpenAI API
Pydantic==2.5.0           # Data validation
```

## 🔒 Segurança

- JWT tokens com expiração configurável
- Passwords hasheadas com bcrypt
- CORS configurável
- Validação de dados com Pydantic
- Environment variables para secrets

## 🚀 Deploy

### Docker (Exemplo)

```dockerfile
FROM python:3.10-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install -r requirements.txt

COPY . .

CMD ["uvicorn", "src_py.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

```bash
# Build
docker build -t chatbot-python .

# Run
docker run -p 8000:8000 -e DATABASE_URL="..." -e OPENAI_API_KEY="..." chatbot-python
```

## 📖 Recursos Adicionais

- [FastAPI Docs](https://fastapi.tiangolo.com/)
- [LangChain Docs](https://python.langchain.com/)
- [LangGraph Docs](https://langchain-ai.github.io/langgraph/)
- [SQLAlchemy Docs](https://docs.sqlalchemy.org/)
- [Pydantic Docs](https://docs.pydantic.dev/)

## 📝 Próximos Passos

- [ ] Integração com WhatsApp Business API (wrapper Python)
- [ ] WebSocket para real-time updates
- [ ] Suporte a múltiplos LLMs (Anthropic, Cohere, etc)
- [ ] Sistema de logging avançado
- [ ] Integração com Alembic para migrations
- [ ] Testes automatizados completos
- [ ] Documentation com Swagger customizado

## 📞 Suporte

Para dúvidas sobre a migração ou da arquitetura Python, consulte a documentação do FastAPI e LangChain.

---

**Versão**: 2.0.0  
**Data de Migração**: 2024
**Status**: Production Ready ✅
