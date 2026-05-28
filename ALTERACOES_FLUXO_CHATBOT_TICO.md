# Alterações — Fluxo do Chatbot Tico Auto Peças

Este pacote atualiza o fluxo automático do chatbot WhatsApp para seguir a sequência operacional solicitada:

1. Boas-vindas com escolha de unidade.
2. Solicitação do nome do cliente.
3. Menu de categoria de interesse.
4. Transferência para a equipe da unidade selecionada.

## Arquivos alterados

- `src_py/demo_chatbot.py`

## Fluxo atual

### Mensagem 1 — Boas-vindas

O cliente recebe a saudação da Tico Auto Peças e escolhe uma unidade:

- 1: Várzea Paulista - Centro
- 2: Várzea Paulista - Jd. América
- 3: Francisco Morato
- 4: Taipas

### Mensagem 2 — Identificação

Após selecionar a unidade, o bot pergunta o nome do cliente.

### Mensagem 3 — Categoria de interesse

Após receber o nome, o bot apresenta as categorias:

1. Sistema de Freios
2. Suspensão
3. Motor
4. Correias
5. Embreagem
6. Filtragem
7. Ignição
8. Combustível
9. Arrefecimento
10. Lubrificação
11. Outros produtos

### Mensagem 4 — Transferência

Após a categoria ser escolhida, o atendimento é enviado para a fila da unidade escolhida.

## Dados registrados

O sistema salva no `metadata` da conversa:

- `selected_unit`
- `customer_name`
- `selected_category`
- `bot_step`

## Observação

As filas válidas continuam sendo:

- Várzea Paulista - Centro
- Várzea Paulista - Jd. América
- Francisco Morato
- Taipas

A fila `Várzea Paulista` sozinha permanece removida/desativada.
