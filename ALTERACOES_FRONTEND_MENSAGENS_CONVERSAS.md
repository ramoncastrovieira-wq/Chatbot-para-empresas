# Correções — Atendimento, conversas e mensagens

Correções aplicadas neste pacote:

- Corrigido erro que impedia a lista de conversas de aparecer na tela de Atendimento.
- Adicionada a função `queueShortName`, que estava faltando no `public/app.js` e quebrava a renderização das conversas.
- Ao clicar em uma conversa, o frontend agora busca as mensagens pela rota correta:
  - `/api/v1/conversations/{conversation_id}/messages`
- As mensagens são exibidas em ordem cronológica, da mais antiga para a mais recente.
- O painel direito agora mostra:
  - nome do cliente;
  - telefone;
  - unidade escolhida;
  - categoria escolhida;
  - status do atendimento.
- Adicionada rota auxiliar `GET /api/v1/messages?conversation_id=ID`, caso seja necessário testar mensagens diretamente no navegador.

As rotas principais usadas pelo painel são:

- `GET /api/v1/conversations`
- `GET /api/v1/conversations/{id}`
- `GET /api/v1/conversations/{id}/messages`
- `POST /api/v1/messages`
