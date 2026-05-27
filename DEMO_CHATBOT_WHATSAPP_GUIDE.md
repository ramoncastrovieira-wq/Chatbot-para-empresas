# Demo Chatbot WhatsApp

Esta versão adiciona uma aba **WhatsApp Demo** ao frontend operacional.

Ela reaproveita a lógica conversacional da versão antiga do projeto, mas sem depender do WhatsApp real.

## O que demonstra

- cliente digitando em interface estilo WhatsApp;
- chatbot respondendo com menu;
- catálogo de peças;
- solicitação de orçamento;
- encaminhamento para fila;
- conversa aparecendo no painel operacional;
- atendente podendo assumir atendimento.

## Endpoint principal

`POST /api/v1/demo-chatbot/send`

Body:

```json
{
  "phone": "11999990000",
  "name": "Cliente WhatsApp",
  "content": "Olá",
  "queue_id": 1
}
```

## Roteiro para cliente leigo

1. Abra o frontend em `http://127.0.0.1:5500`.
2. Crie ou confirme uma fila.
3. Vá na aba **WhatsApp Demo**.
4. Envie `Olá`.
5. Envie `1` para produtos.
6. Envie `1` para Freios.
7. Envie `2` para Disco de Freio.
8. Envie dados de orçamento ou envie `3` no menu para falar com atendente.
9. Mostre a conversa entrando na fila e sendo assumida no painel.
