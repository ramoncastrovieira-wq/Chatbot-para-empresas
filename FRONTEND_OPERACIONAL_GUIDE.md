# Frontend operacional — Tico Auto Peças Hub

Esta versão adiciona um painel HTML conectado ao backend FastAPI.

## O que foi adicionado/corrigido

- `frontend/index.html` refeito como painel operacional.
- `public/index.html` atualizado com a mesma interface.
- Endpoint `GET /api/v1/dashboard/summary`.
- Endpoint `GET /api/v1/users`.
- Endpoint `GET /api/v1/queues/{queue_id}/items`.
- Endpoints de atendentes revisados:
  - `GET /api/v1/attendants`
  - `POST /api/v1/attendants`
  - `GET /api/v1/attendants/{attendant_id}`
  - `PATCH /api/v1/attendants/{attendant_id}`
- Endpoint de atribuição:
  - `POST /api/v1/conversations/{conversation_id}/assign/{attendant_id}`
- Worker ajustado para usar `SimpleWorker` automaticamente no Windows.
- `.env` configurado para usar PostgreSQL Docker na porta `5433`.
- CORS liberado para `http://127.0.0.1:5500` e `http://localhost:5500`.
- `bcrypt==4.0.1` fixado para evitar conflito com `passlib`.

## Como iniciar

### Terminal 1 — Docker

```powershell
cd C:\fonts\Chatbot-para-empresas-workers
docker compose down -v
docker compose up -d postgres redis
docker ps
```

### Terminal 2 — Backend

```powershell
cd C:\fonts\Chatbot-para-empresas-workers
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
python -m uvicorn src_py.main:app --reload
```

Swagger:

```txt
http://127.0.0.1:8000/docs
```

### Terminal 3 — Worker

```powershell
cd C:\fonts\Chatbot-para-empresas-workers
.\.venv\Scripts\Activate.ps1
python -m src_py.workers.worker
```

### Terminal 4 — Frontend

```powershell
C:\fonts\Chatbot-para-empresas-workers\.venv\Scripts\python.exe -m http.server 5500 --directory C:\fonts\Chatbot-para-empresas-workers\frontend
```

Abrir:

```txt
http://127.0.0.1:5500
```

## Fluxo recomendado para demonstração

1. Criar usuário pelo frontend ou Swagger.
2. Criar atendente vinculado ao usuário.
3. Criar fila.
4. Rodar o fluxo completo pelo botão `Executar fluxo completo`.
5. Mostrar o worker processando o job.
6. Mostrar conversa atribuída ao atendente.
