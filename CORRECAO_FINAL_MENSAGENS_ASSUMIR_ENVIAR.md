# Correção final — mensagens no painel + envio do atendente

Esta versão corrige a regressão em que as mensagens não apareciam no painel e mantém o envio pelo WhatsApp real.

## Corrigido

- Conversas continuam sendo carregadas no painel.
- Ao clicar em uma conversa, o frontend busca mensagens por:
  - `GET /api/v1/conversations/{id}/messages`
- O envio pelo painel não fica bloqueado caso não exista atendente cadastrado.
- Se houver atendente vinculado, o sistema tenta assumir automaticamente.
- A mensagem do atendente é salva no histórico.
- O backend tenta enviar a mensagem para o WhatsApp Gateway em:
  - `POST http://127.0.0.1:3001/api/wa/send`
- Se o gateway estiver offline, a mensagem permanece salva no histórico e o painel não quebra.

## Arquivos alterados

- `public/app.js`
- `public/index.html`
- `src_py/routes.py`
- `src_py/config/settings.py`
