# Workers do projeto

Esta versão adiciona Redis + RQ para processar tarefas em segundo plano.

## Para subir infraestrutura

```powershell
docker compose up -d postgres redis
```

## Terminal 1: backend

```powershell
.\.venv\Scripts\Activate.ps1
python -m uvicorn src_py.main:app --reload
```

## Terminal 2: worker

```powershell
.\.venv\Scripts\Activate.ps1
python -m src_py.workers.worker
```

## Teste no Swagger

Abra:

```txt
http://127.0.0.1:8000/docs
```

Use:

```txt
POST /api/v1/messages/async
```

Depois consulte:

```txt
GET /api/v1/jobs/{job_id}
```

## Para usar tudo via Docker

```powershell
docker compose up --build
```

Isso sobe PostgreSQL, Redis, backend e worker.
