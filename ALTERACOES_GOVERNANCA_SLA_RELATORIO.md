# Alterações — Governança Operacional, SLA e Relatório Diário

Esta versão mantém o projeto em modo interno e adiciona a próxima etapa do MVP operacional.

## O que foi adicionado

### Painel inicial
- Resumo diário com:
  - total monitorado;
  - aguardando;
  - em atendimento;
  - finalizados hoje;
  - SLA vermelho.
- Cards das filas com tempo do atendimento mais antigo.

### Atendimento
- Badge de SLA em cada conversa.
- SLA também aparece nos dados do cliente.
- Regras operacionais no painel lateral.

### Supervisor
- Relatório diário consolidado.
- SLA por unidade.
- Checklist operacional diário.
- Regras de governança.
- Conversas recentes com SLA visual e tags.

### Backend
- Novo endpoint:
  - `GET /api/v1/reports/daily`

## Critério de SLA

- Verde: até 9 minutos sem atualização.
- Amarelo: 10 a 29 minutos.
- Vermelho: 30 minutos ou mais.

## Objetivo

Ajudar o supervisor a evitar:
- leads parados;
- conversas sem retorno;
- conflito entre unidades;
- atendimentos sem finalização.
