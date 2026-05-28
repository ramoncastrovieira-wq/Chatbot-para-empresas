# Atualização — Fluxo de Assumir Atendimento

Esta versão adiciona no frontend uma área de **Próximo atendimento**.

## Fluxo visual

1. Crie usuário.
2. Crie atendente.
3. Crie contato.
4. Crie conversa.
5. Crie ou selecione fila.
6. Adicione conversa à fila.
7. Clique em **Puxar próximo da fila**.
8. O card “Próximo atendimento” será preenchido com a conversa retornada.
9. Clique em **Assumir atendimento carregado**.
10. A conversa será atribuída ao atendente selecionado e mudará para `in_progress`.

## Endpoints usados

- `GET /api/v1/queues/{queue_id}/next`
- `GET /api/v1/conversations/{conversation_id}`
- `POST /api/v1/conversations/{conversation_id}/assign/{attendant_id}`

## Observação importante

Para o worker RQ funcionar no Windows, use o worker via Docker:

```powershell
docker compose up worker
```

Não use o worker local do PowerShell, pois o RQ pode falhar com `SIGALRM`/`fork`.
