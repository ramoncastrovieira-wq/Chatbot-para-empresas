# Alterações aplicadas — MVP Operacional do HUB WhatsApp

Este pacote foi ajustado para ficar mais próximo do documento **PROJETO — HUB CENTRAL DE ATENDIMENTO WHATSAPP TICO AUTO PEÇAS**.

## Principais mudanças

1. **Filas padrão criadas automaticamente**
   - Francisco Morato
   - Taipas

2. **Triagem inicial por unidade**
   - O demo do chatbot agora começa com o menu de escolha da unidade.
   - A conversa é vinculada à fila correta após o cliente responder 1, 2, 3 ou 4.

3. **Roteamento para fila**
   - Quando o cliente pede orçamento ou atendente humano, a conversa entra na fila da unidade selecionada.
   - O sistema evita duplicar a mesma conversa na mesma fila quando ela já está aguardando/processando.

4. **Histórico correto de atendente**
   - Mensagens enviadas por atendente agora são apenas registradas no histórico.
   - Antes, o endpoint `/messages` tratava qualquer envio como mensagem de cliente e acionava o bot novamente.

5. **Campo `queue_id` na conversa**
   - Conversas agora podem guardar diretamente a fila/unidade vinculada.
   - Foi adicionada rotina de compatibilidade para bancos já existentes: se a tabela `conversations` não tiver `queue_id`, o backend tenta adicionar a coluna no startup.

6. **Endpoint de setup**
   - Novo endpoint: `POST /api/v1/setup/seed-queues`
   - Ele recria/verifica as filas operacionais padrão.

7. **Webhook WhatsApp mais operacional**
   - O webhook agora salva/processa mensagens usando o fluxo demonstrativo de triagem.
   - Corrigido o domínio base da API Graph para `graph.facebook.com`.

8. **Frontend de teste ajustado**
   - O botão “Criar cliente teste” agora usa o endpoint `/demo-chatbot/send`.
   - O teste simula melhor o fluxo real: cliente manda “Olá”, recebe menu de unidade e depois escolhe a fila.

## Como testar o fluxo

1. Inicie o backend normalmente.
2. Acesse o painel em `http://localhost:8000`.
3. Crie/login com o admin inicial.
4. Vá para Atendimento.
5. Clique em “Criar cliente teste”.
6. Abra a conversa criada.
7. Responda como cliente usando `1`, `2`, `3` ou `4` para selecionar a unidade.
8. Depois envie `2` para orçamento ou `3` para falar com atendente.
9. A conversa entrará na fila da unidade escolhida.

## Observação

Não consegui executar o servidor completo neste ambiente porque as dependências do projeto, como SQLAlchemy/FastAPI, não estão instaladas no container. Mesmo assim, validei a sintaxe Python com `compileall` e a sintaxe JavaScript com `node --check`.
