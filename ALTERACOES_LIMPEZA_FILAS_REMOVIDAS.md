# Alterações — limpeza definitiva de filas removidas

Foram aplicadas correções para impedir que filas antigas persistidas no PostgreSQL continuem aparecendo no painel.

Filas removidas/desativadas automaticamente:
- Jundiaí / Jundiai
- Várzea Paulista / Varzea Paulista
- Campo Limpo

Filas mantidas:
- Francisco Morato
- Taipas

Arquivos alterados:
- `src_py/demo_chatbot.py`
- `src_py/main.py`
- `src_py/repositories.py`
- `src_py/routes.py`
- `public/app.js`

Observação: se o banco antigo já tinha essas filas, elas são desativadas automaticamente ao iniciar o backend. Também foi criado o endpoint `POST /api/v1/setup/cleanup-removed-queues` para executar a limpeza manualmente.
