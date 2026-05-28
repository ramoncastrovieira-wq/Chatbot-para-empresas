# Correção — Assumir Atendimento + Enviar Mensagem

## Problemas corrigidos

- Botão "Assumir" não liberava corretamente o envio.
- Mensagens do atendente não eram enviadas para o WhatsApp real.
- Conversa não mudava para "em atendimento".
- Gateway WhatsApp estava instável com Puppeteer headless.

## Ajustes realizados

### Frontend
Arquivo:
- public/app.js

Correções:
- envio agora força atribuição do atendente;
- mensagens enviadas pelo painel atualizam corretamente;
- melhor tratamento de erros.

### Backend
Arquivo:
- src_py/routes.py

Correções:
- envio agora chama:
  POST /api/wa/send
- mensagens do atendente vão para o WhatsApp real;
- conversa muda automaticamente para in_progress.

### WhatsApp Gateway
Arquivo:
- whatsapp_gateway/server.js

Correções:
- Chromium agora abre visualmente;
- argumentos extras para estabilidade;
- menos crashes do Puppeteer.
