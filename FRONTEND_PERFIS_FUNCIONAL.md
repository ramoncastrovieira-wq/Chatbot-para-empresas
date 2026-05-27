# Frontend funcional por perfis

Este pacote separa o frontend em três experiências:

- **Admin**: CRUD de usuários, atendentes e filas.
- **Supervisor**: visão operacional de filas, conversas e métricas.
- **Atendente**: tela de atendimento em formato de chat.

## Como acessar

1. Suba Postgres e Redis.
2. Rode o backend:

```powershell
uvicorn src_py.main:app --reload
```

3. Abra:

```txt
http://127.0.0.1:8000/
```

## Primeiro acesso

Na tela de login, informe usuário e senha e clique em **Criar admin inicial**. Depois clique em **Entrar**.

## Observação sobre Supervisor

O backend original possuía os perfis `admin`, `attendant` e `user`. Para não quebrar bancos já criados, o frontend trata o perfil `user` como **Supervisor**.
