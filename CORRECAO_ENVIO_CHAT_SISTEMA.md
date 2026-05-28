# Correção — Envio de mensagem pelo chat do sistema

Correções aplicadas:

- Criado endpoint `POST /api/v1/panel/send-message`.
- O painel agora usa esse endpoint para enviar mensagens do atendente.
- A mensagem sempre é salva no histórico, mesmo se o WhatsApp Gateway estiver offline.
- Quando o gateway estiver conectado, o backend envia para `POST /api/wa/send`.
- O botão Enviar agora é desabilitado durante o envio e reabilitado ao final.
- Enter envia a mensagem; Shift+Enter quebra linha.
- O frontend também tem fallback para `POST /api/v1/messages`.
- Adicionado cache bust em `index.html`.

Fluxo esperado:

1. Abrir conversa no painel.
2. Clicar em Assumir ou simplesmente digitar mensagem.
3. Clicar em Enviar.
4. A mensagem aparece no histórico.
5. Se o gateway estiver CONNECTED, a mensagem também chega no WhatsApp real.
