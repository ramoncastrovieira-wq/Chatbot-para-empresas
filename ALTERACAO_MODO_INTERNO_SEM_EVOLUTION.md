# Alteração — Modo interno sem Evolution/WhatsApp externo

Esta versão pausa temporariamente a camada externa de WhatsApp/Evolution/Meta para focar no que o documento operacional pede como núcleo do MVP:

- painel de atendimento;
- filas por unidade;
- histórico de conversas;
- atendentes;
- assumir atendimento;
- finalizar atendimento;
- visão supervisor;
- simulação de entrada de cliente;
- base para métricas.

## O que mudou

### Frontend

- Removida a aba principal de WhatsApp/Evolution.
- Adicionada a aba **Simulador interno**.
- O botão **Enviar** no chat salva a mensagem no histórico interno sem tentar enviar para provedor externo.
- O painel mostra que o modo atual é interno/painel.

### Backend

- A função de envio externo agora retorna `external_messaging_disabled`.
- `/panel/send-message` continua salvando mensagens normalmente no banco.
- `/whatsapp/status` permanece apenas como compatibilidade, informando que a camada externa está pausada.
- `/whatsapp/test-send` não envia nada externo nesta fase.

## Como testar

1. Inicie o backend.
2. Abra o painel.
3. Use **Simulador interno** para criar entrada de cliente.
4. Vá para **Atendimento**.
5. Assuma a conversa.
6. Responda pelo chat.
7. Finalize a conversa.

## Próxima etapa

Depois que o painel estiver estável, a camada externa pode ser plugada com Evolution API ou Meta Cloud API.
