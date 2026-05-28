# Alteração — Remoção do QR Code e migração para WhatsApp API profissional

## Objetivo

O projeto deixou de depender do `whatsapp-web.js`, Puppeteer, Chromium e QR Code como caminho principal de atendimento.

A arquitetura agora segue o documento operacional do HUB Tico Auto Peças:

- WhatsApp API profissional
- webhook oficial
- painel de atendimento
- filas por unidade
- histórico de conversas
- base para métricas e CRM

## O que mudou

### Frontend

Arquivo:
- `public/app.js`

A aba WhatsApp agora mostra:
- status da API profissional;
- webhook de verificação;
- webhook de recebimento;
- campos necessários do `.env`;
- teste de envio pela API oficial.

Foram removidas da interface:
- QR Code;
- botão reiniciar sessão;
- dependência visual do gateway local.

### Backend

Arquivos:
- `src_py/routes.py`
- `src_py/integrations_whatsapp.py`
- `src_py/config/settings.py`

Adicionado:
- `GET /api/v1/whatsapp/status`
- `POST /api/v1/whatsapp/test-send`
- envio pelo endpoint oficial da Meta Cloud API;
- uso de `WHATSAPP_PHONE_NUMBER_ID`;
- webhook oficial em `/webhooks/whatsapp`.

### Gateway antigo

A pasta `whatsapp_gateway` foi movida para:

- `whatsapp_gateway_LEGADO_QR_REMOVIDO`

Ela não faz mais parte do fluxo principal.

## Variáveis necessárias no `.env`

```env
WHATSAPP_PHONE_NUMBER_ID=
WHATSAPP_ACCESS_TOKEN=
WHATSAPP_WEBHOOK_TOKEN=
```

## Próximo passo

Publicar o backend em HTTPS, configurar o webhook no painel da Meta e validar envio/recebimento real pela Cloud API.
