# Chatbot para Empresas - v2.0.0 (Python)

[![Python 3.10+](https://img.shields.io/badge/python-3.10%2B-blue)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.104-green)](https://fastapi.tiangolo.com/)
[![LangChain](https://img.shields.io/badge/LangChain-0.1-orange)](https://python.langchain.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-12%2B-lightblue)](https://www.postgresql.org/)

> 🚀 Migração completa de TypeScript/Node.js para Python com integração de IA avançada usando LangChain e LangGraph

## ✨ Destaques

- **FastAPI**: Framework web moderno, rápido e type-safe
- **LangChain + LangGraph**: Orquestração de fluxos de IA complexos
- **SQLAlchemy ORM**: Acesso a dados robusto com PostgreSQL
- **JWT Authentication**: Autenticação segura com tokens
- **RESTful API**: Endpoints bem documentados com Swagger
- **Async/Await**: Operações completamente assíncronas
- **Pydantic**: Validação de dados e serialização

## 🎯 Funcionalidades

### Core
- ✅ Gerenciamento de contatos (CRUD)
- ✅ Conversas e histórico de mensagens
- ✅ Usuários e autenticação JWT
- ✅ Fila de atendimento
- ✅ Sistema de atendentes

### IA & Automação
- 🤖 Processamento de mensagens com LLM (GPT-3.5)
- 🧠 Detecção de intenção automática
- 💬 Geração de respostas contextualizadas
- 📊 Análise de sentimento
- 🔄 Fluxos de roteamento inteligentes

### Integrações
- 📱 Webhook para WhatsApp Business API
- 🔌 Extensível para outros canais
- 📡 WebSocket para real-time (em desenvolvimento)

## 🚀 Quick Start

### Pré-requisitos
```bash
# Python 3.10+
python --version

# PostgreSQL 12+
# Windows: https://www.postgresql.org/download/windows/
# macOS: brew install postgresql
# Linux: sudo apt-get install postgresql
```

### Instalação

```bash
# 1. Clonar projeto
cd projeto

# 2. Criar ambiente virtual
python -m venv venv

# Windows
venv\Scripts\activate

# Linux/macOS
source venv/bin/activate

# 3. Instalar dependências
pip install -r requirements.txt

# Ou com Poetry
poetry install
```

### Configuração

```bash
# 1. Criar arquivo .env
cp .env.example .env

# 2. Configurar variáveis (editar .env)
# DATABASE_URL=postgresql://user:password@localhost:5432/chatbot
# OPENAI_API_KEY=sk-...
# SECRET_KEY=sua-chave-secreta

# Windows PowerShell (alternativa)
$env:DATABASE_URL = "postgresql://user:password@localhost:5432/chatbot"
$env:OPENAI_API_KEY = "sk-..."
```

### Executar

```bash
# Iniciar servidor (porta 8000)
python -m uvicorn src_py.main:app --reload

# Ou com poetry
poetry run uvicorn src_py.main:app --reload

# Acessar
# API: http://localhost:8000
# Docs: http://localhost:8000/docs
# ReDoc: http://localhost:8000/redoc
```

## 📚 API Endpoints

### Autenticação
```bash
# Registrar
curl -X POST "http://localhost:8000/api/v1/auth/register" \
  -H "Content-Type: application/json" \
  -d '{"username":"user","password":"pass","email":"user@example.com"}'

# Login
curl -X POST "http://localhost:8000/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username":"user","password":"pass"}'

# Obter usuário autenticado
curl -X GET "http://localhost:8000/api/v1/auth/me" \
  -H "Authorization: Bearer <token>"
```

### Contatos
```bash
# Criar contato
curl -X POST "http://localhost:8000/api/v1/contacts" \
  -H "Content-Type: application/json" \
  -d '{"name":"João","phone":"+5511999999999","email":"joao@example.com"}'

# Listar
curl -X GET "http://localhost:8000/api/v1/contacts"

# Obter específico
curl -X GET "http://localhost:8000/api/v1/contacts/1"
```

### Conversas
```bash
# Criar conversa
curl -X POST "http://localhost:8000/api/v1/conversations" \
  -H "Content-Type: application/json" \
  -d '{"contact_id":1,"title":"Consulta"}'

# Enviar mensagem (processa com IA)
curl -X POST "http://localhost:8000/api/v1/messages" \
  -H "Content-Type: application/json" \
  -d '{"conversation_id":1,"contact_id":1,"content":"Qual é o preço?"}'

# Obter conversa com histórico
curl -X GET "http://localhost:8000/api/v1/conversations/1"
```

## 🤖 Exemplo: Usar IA

```python
import asyncio
from src_py.config import get_db_context
from src_py.services import get_message_service

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
```

## 📁 Estrutura do Projeto

```
src_py/
├── config/              # Configurações
│   ├── settings.py      # Variáveis de ambiente
│   ├── database.py      # SQLAlchemy
│   └── __init__.py
├── database/            # Modelos
│   ├── models.py        # SQLAlchemy models
│   └── __init__.py
├── ai_flows/            # IA com LangChain/LangGraph
│   ├── manager.py       # Orquestrador
│   ├── chains.py        # Chains customizadas
│   └── __init__.py
├── schemas.py           # Pydantic DTOs
├── repositories.py      # Data Access Layer
├── services.py          # Business Logic
├── auth.py             # Autenticação JWT
├── routes.py           # API Endpoints
├── integrations_whatsapp.py  # WhatsApp Gateway
├── main.py             # FastAPI app
└── __init__.py
```

## 🔧 Configuração Avançada

### PostgreSQL

```bash
# Criar usuário e banco
createuser chatbot_user
createdb -O chatbot_user chatbot_db

# Windows (psql)
CREATE USER chatbot_user WITH PASSWORD 'password';
CREATE DATABASE chatbot_db OWNER chatbot_user;
```

### OpenAI API

```bash
# Obter chave em: https://platform.openai.com/api-keys
export OPENAI_API_KEY="sk-..."
```

### Variáveis de Ambiente

| Variável | Descrição | Padrão |
|----------|-----------|--------|
| `DATABASE_URL` | PostgreSQL connection | - |
| `OPENAI_API_KEY` | OpenAI API key | - |
| `SECRET_KEY` | JWT secret key | - |
| `DEBUG` | Modo debug | False |
| `PORT` | Porta do servidor | 8000 |
| `LLM_MODEL` | Modelo LLM | gpt-3.5-turbo |

## 🧪 Testes

```bash
# Rodar exemplos
python examples.py

# Testes (quando implementados)
pytest

# Com cobertura
pytest --cov=src_py
```

## 📚 Documentação

- [Guia de Migração](./MIGRATION_GUIDE.md) - Detalhes técnicos da migração
- [API Docs (Swagger)](http://localhost:8000/docs) - Documentação interativa
- [FastAPI Docs](https://fastapi.tiangolo.com/)
- [LangChain Docs](https://python.langchain.com/)

## 🔄 Fluxo de IA

```
Mensagem do Cliente
    ↓
[1] Processar & Normalizar
    ↓
[2] Detectar Intenção (produto, suporte, etc)
    ↓
[3] Gerar Resposta com LLM
    ↓
[4] Salvar na Base de Dados
    ↓
Resposta Enviada
```

## 🌟 Recursos Principais

### MessageService
```python
from src_py.services import get_message_service

service = get_message_service(db)

# Processar mensagem com IA
response = await service.process_incoming_message(
    conversation_id=1,
    contact_id=1,
    content="Pergunta do cliente"
)

# Obter histórico
history = service.get_conversation_history(conversation_id=1)
```

### AIFlowsManager
```python
from src_py.ai_flows import get_ai_manager, ConversationState

ai_manager = get_ai_manager()

state = ConversationState(
    messages=[{"role": "user", "content": "..."}],
    conversation_id=1,
    contact_phone="+5511999999999"
)

result = await ai_manager.process_conversation(state)
```

## 🚀 Deploy

### Docker
```bash
# Build
docker build -t chatbot-python .

# Run
docker run -p 8000:8000 \
  -e DATABASE_URL="..." \
  -e OPENAI_API_KEY="..." \
  chatbot-python
```

### Vercel / Railway
```bash
# Compatível com ambientes serverless
# Seguir documentação de cada plataforma
```

## 🐛 Troubleshooting

### "ModuleNotFoundError: No module named 'src_py'"
```bash
# Execute da raiz do projeto
python -m uvicorn src_py.main:app --reload
```

### "psycopg2: could not translate host name"
```bash
# Verificar DATABASE_URL
# postgresql://user:password@localhost:5432/dbname
```

### "OPENAI_API_KEY not set"
```bash
# Configurar variável de ambiente
export OPENAI_API_KEY="sk-..."
```

## 📝 Licença

MIT

## 🤝 Contribuindo

Contribuições são bem-vindas! Por favor:

1. Fork o projeto
2. Crie uma branch para sua feature (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

## 📞 Suporte

Para dúvidas ou problemas:
- 📖 Consulte a [Documentação](./MIGRATION_GUIDE.md)
- 🔗 Veja a [API Docs](http://localhost:8000/docs)
- 💬 Abra uma [Issue](https://github.com/seu-usuario/chatbot-python/issues)

---

**Versão**: 2.0.0  
**Status**: Production Ready ✅  
**Última atualização**: 2024
