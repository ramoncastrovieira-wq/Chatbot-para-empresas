# Alterações — MVP interno operacional

Esta versão mantém a integração externa de WhatsApp/Evolution pausada e foca no núcleo operacional do HUB.

## Melhorias aplicadas

- Painel do supervisor com métricas por unidade:
  - aguardando;
  - em atendimento;
  - finalizados hoje;
  - espera mais antiga.
- Conversas recentes com tags e categoria.
- Classificação manual por tags:
  - Orçamento;
  - Freios;
  - Suspensão;
  - Motor;
  - Urgente;
  - Cliente recorrente;
  - Pós-venda.
- Campo para tags extras separadas por vírgula.
- Transferência interna de conversa para outra unidade/fila.
- Histórico de transferência salvo no `metadata.transfer_history`.
- Checklist operacional diário no painel do supervisor.
- Mantido foco em modo interno: painel, filas, atendentes, histórico e métricas.

## Próxima validação

1. Criar cliente teste.
2. Gerar conversa.
3. Classificar com tags.
4. Transferir para outra unidade.
5. Assumir atendimento.
6. Responder no histórico.
7. Finalizar conversa.
8. Conferir o painel Supervisor.
