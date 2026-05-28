# Correção — Envio manual do painel para WhatsApp

## Problema

O chatbot automático respondia normalmente, mas o envio manual pelo painel falhava.

## Causa

Conversas vindas do WhatsApp estavam chegando com identificadores:

- `@lid`

Exemplo:

- `100489400205419@lid`

O sistema tentava enviar usando:

- `@c.us`

Isso quebrava o envio manual.

## Correção aplicada

Agora o sistema:

- salva o JID real do WhatsApp;
- reutiliza o mesmo JID no envio manual;
- mantém compatibilidade com números normais;
- não converte automaticamente para `@c.us`.

## Resultado

Agora:

- chatbot automático continua funcionando;
- mensagens enviadas pelo painel chegam corretamente no WhatsApp real.
