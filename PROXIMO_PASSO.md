# Próximo passo do projeto

O projeto foi corrigido para priorizar a etapa mais importante agora: deixar o backend Python executável e estável.

## O que foi ajustado

- Removida a mistura operacional com o legado Node/WhatsApp Web.js no pacote corrigido.
- Removidos `node_modules`, `.wwebjs_auth`, cache de sessão e arquivos locais que não devem ir para o projeto.
- Corrigidos os schemas Pydantic que estavam sobrescrevendo `MessageResponse`.
- Corrigido o uso de `metadata`, que conflita com o SQLAlchemy.
- Corrigido o endpoint `/api/v1/health` para usar `sqlalchemy.text("SELECT 1")`.
- Corrigida a listagem de conversas, que consultava a classe errada.
- Adicionado fallback para mensagens quando `OPENAI_API_KEY` não estiver configurada.
- Ajustado Python alvo para 3.12.
- Ajustado Docker, `.env.example`, `.gitignore`, `requirements.txt` e `pyproject.toml`.
- Adicionados scripts `iniciar.ps1` e `iniciar.bat` para Windows.

## Próximo passo imediato

1. Abrir a pasta corrigida.
2. Copiar `.env.example` para `.env`.
3. Subir o PostgreSQL:

```bash
docker compose up -d postgres
```

4. Criar o ambiente Python 3.12:

```powershell
py -3.12 -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

5. Iniciar a API:

```bash
uvicorn src_py.main:app --reload
```

6. Abrir:

```text
http://localhost:8000/docs
```

7. Testar primeiro:

```text
GET /api/v1/health
POST /api/v1/auth/register
POST /api/v1/auth/login
POST /api/v1/contacts
POST /api/v1/conversations
POST /api/v1/messages
```

## Marco de conclusão desta etapa

A etapa estará concluída quando o endpoint `/api/v1/health` responder `healthy` e os fluxos de cadastro, contato, conversa e mensagem funcionarem no Swagger.

Só depois disso vale integrar WhatsApp Cloud API, Chatwoot ou automações externas.
