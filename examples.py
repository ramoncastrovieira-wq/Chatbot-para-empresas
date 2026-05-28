"""
Exemplos de Uso - Chatbot para Empresas (Python)
Demonstra como usar os serviços e fluxos de IA
"""

import asyncio
from sqlalchemy.orm import Session

from src_py.config import get_db_context, settings
from src_py.services import (
    get_user_service, get_contact_service, get_conversation_service,
    get_message_service, get_queue_service
)
from src_py.ai_flows import get_ai_manager, ConversationState


# ============ Exemplo 1: Criar Usuário ============
def example_1_create_user():
    """Exemplo: Criar um novo usuário"""
    print("\n=== Exemplo 1: Criar Usuário ===")
    
    with get_db_context() as db:
        user_service = get_user_service(db)
        
        user = user_service.create_user(
            username="support_agent",
            password="secure_password_123",
            email="support@example.com",
            role="attendant"
        )
        
        print(f"✅ Usuário criado: {user.username} (ID: {user.id})")
        print(f"   Email: {user.email}")
        print(f"   Role: {user.role}")
        
        return user.id


# ============ Exemplo 2: Criar Contato e Conversa ============
def example_2_create_contact_and_conversation():
    """Exemplo: Criar contato e iniciar conversa"""
    print("\n=== Exemplo 2: Criar Contato e Conversa ===")
    
    with get_db_context() as db:
        # Criar contato
        contact_service = get_contact_service(db)
        contact = contact_service.create_contact(
            phone="+5511987654321",
            name="João Silva",
            email="joao@example.com",
            metadata={"company": "Auto Peças Silva"}
        )
        
        print(f"✅ Contato criado: {contact.name}")
        print(f"   Telefone: {contact.phone}")
        print(f"   ID: {contact.id}")
        
        # Criar conversa
        conversation_service = get_conversation_service(db)
        conversation = conversation_service.create_conversation(
            contact_id=contact.id,
            title="Consulta sobre pneus",
            metadata={"source": "whatsapp"}
        )
        
        print(f"\n✅ Conversa iniciada:")
        print(f"   ID: {conversation.id}")
        print(f"   Status: {conversation.status}")
        print(f"   Criada em: {conversation.created_at}")
        
        return contact.id, conversation.id


# ============ Exemplo 3: Processar Mensagem com IA ============
async def example_3_process_message_with_ai():
    """Exemplo: Enviar mensagem e processar com IA"""
    print("\n=== Exemplo 3: Processar Mensagem com IA ===")
    
    # Primeiro, verificar se OpenAI está configurado
    if not settings.OPENAI_API_KEY:
        print("⚠️  OPENAI_API_KEY não está configurada")
        print("   Configure a variável de ambiente OPENAI_API_KEY")
        return
    
    with get_db_context() as db:
        # Usar contato e conversa do exemplo anterior
        contact_id = 1
        conversation_id = 1
        
        message_service = get_message_service(db)
        
        print(f"📤 Enviando mensagem para conversa {conversation_id}...")
        
        try:
            # Enviar mensagem e obter resposta da IA
            response = await message_service.process_incoming_message(
                conversation_id=conversation_id,
                contact_id=contact_id,
                content="Qual é o preço do pneu Michelin 185/65 R15?",
                external_id="whatsapp_msg_123"
            )
            
            print(f"✅ Resposta da IA recebida:")
            print(f"   {response[:200]}...")
            
        except Exception as e:
            print(f"❌ Erro ao processar mensagem: {e}")


# ============ Exemplo 4: Fluxo de IA com LangGraph ============
async def example_4_ai_flow_with_langgraph():
    """Exemplo: Usar fluxo de IA direto com LangGraph"""
    print("\n=== Exemplo 4: Fluxo de IA com LangGraph ===")
    
    if not settings.OPENAI_API_KEY:
        print("⚠️  OPENAI_API_KEY não está configurada")
        return
    
    try:
        ai_manager = get_ai_manager()
        
        # Criar estado de conversa
        state = ConversationState(
            messages=[
                {"role": "user", "content": "Preciso de pneus para meu carro"}
            ],
            conversation_id=1,
            contact_phone="+5511987654321",
            contact_name="João Silva",
            metadata={"type": "product_inquiry"}
        )
        
        print("🤖 Processando através do grafo de IA...")
        
        # Processar
        result = await ai_manager.process_conversation(state)
        
        print("✅ Resultado do processamento:")
        print(f"   Mensagens no estado: {len(result.messages)}")
        print(f"   Status: {result.status}")
        print(f"   Intenção detectada: {result.metadata.get('intent', 'N/A')}")
        
        # Mostrar resposta final
        if result.messages:
            last_msg = result.messages[-1]
            print(f"\n🤖 Resposta: {last_msg.get('content', 'N/A')[:150]}...")
    
    except Exception as e:
        print(f"❌ Erro no fluxo de IA: {e}")
        import traceback
        traceback.print_exc()


# ============ Exemplo 5: Usar Chains Customizadas ============
async def example_5_custom_chains():
    """Exemplo: Usar chains customizadas de LangChain"""
    print("\n=== Exemplo 5: Chains Customizadas ===")
    
    if not settings.OPENAI_API_KEY:
        print("⚠️  OPENAI_API_KEY não está configurada")
        return
    
    try:
        from langchain.chat_models import ChatOpenAI
        from src_py.ai_flows import (
            ProductRecommendationChain,
            ConversationSummarizerChain,
            HandoffEvaluatorChain
        )
        
        llm = ChatOpenAI(
            model_name=settings.LLM_MODEL,
            api_key=settings.OPENAI_API_KEY
        )
        
        # Exemplo 1: Recomendação de produtos
        print("\n📦 Recomendação de Produtos:")
        rec_chain = ProductRecommendationChain(llm)
        recommendation = await rec_chain.recommend(
            customer_need="Pneus para SUV",
            purchase_history="Comprou pneus Goodyear em 2023",
            budget="R$ 3000"
        )
        print(f"   {recommendation[:200]}...")
        
        # Exemplo 2: Sumarizar conversa
        print("\n📝 Sumarização de Conversa:")
        summary_chain = ConversationSummarizerChain(llm)
        conversation_text = """
        Cliente: Preciso de pneus para meu carro
        Bot: Qual é o modelo do seu carro?
        Cliente: É um Honda Civic 2020
        Bot: Recomendo os pneus Michelin ou Goodyear
        Cliente: Qual é o preço?
        Bot: Michelin custa R$ 500 cada
        """
        summary = await summary_chain.summarize(conversation_text)
        print(f"   {summary[:200]}...")
        
        # Exemplo 3: Avaliar necessidade de handoff
        print("\n🔄 Avaliar Handoff para Humano:")
        handoff_chain = HandoffEvaluatorChain(llm)
        evaluation = await handoff_chain.evaluate(
            message="Não consegui resolver meu problema com você",
            history="Cliente tentou 3 vezes resolver",
            previous_attempts="Recomendações de produtos, perguntas sobre entrega"
        )
        print(f"   Transferir para humano: {evaluation.get('should_handoff', False)}")
        print(f"   Razão: {evaluation.get('reason', 'N/A')}")
    
    except Exception as e:
        print(f"❌ Erro nas chains: {e}")
        import traceback
        traceback.print_exc()


# ============ Exemplo 6: Fila de Atendimento ============
def example_6_queue_management():
    """Exemplo: Gerenciar fila de atendimento"""
    print("\n=== Exemplo 6: Fila de Atendimento ===")
    
    with get_db_context() as db:
        queue_service = get_queue_service(db)
        
        # Criar fila
        queue = queue_service.create_queue(
            name="suporte_tecnico",
            description="Fila de suporte técnico prioritário",
            priority=10
        )
        
        print(f"✅ Fila criada: {queue.name}")
        print(f"   ID: {queue.id}")
        print(f"   Prioridade: {queue.priority}")
        
        # Adicionar conversa à fila
        queue_item_id = queue_service.add_to_queue(
            queue_id=queue.id,
            conversation_id=1
        )
        
        print(f"\n✅ Conversa adicionada à fila:")
        print(f"   Item ID: {queue_item_id}")
        
        # Obter próxima conversa
        next_item = queue_service.get_next_in_queue(queue.id)
        if next_item:
            print(f"\n✅ Próxima conversa na fila:")
            print(f"   Conversa ID: {next_item.conversation_id}")
            print(f"   Posição: {next_item.position}")


# ============ Exemplo 7: Listar Conversas ============
def example_7_list_conversations():
    """Exemplo: Listar conversas e histórico"""
    print("\n=== Exemplo 7: Listar Conversas ===")
    
    with get_db_context() as db:
        conversation_service = get_conversation_service(db)
        message_service = get_message_service(db)
        
        # Listar conversas abertas
        open_conversations = conversation_service.list_open(limit=10)
        
        print(f"✅ Conversas abertas ({len(open_conversations)}):")
        
        for conv in open_conversations:
            print(f"\n   Conversa ID {conv.id}:")
            print(f"   - Contato: {conv.contact.name}")
            print(f"   - Status: {conv.status}")
            print(f"   - Criada em: {conv.created_at}")
            
            # Histórico da conversa
            history = message_service.get_conversation_history(conv.id, limit=3)
            if history:
                print(f"   - Últimas mensagens:")
                for msg in history[-3:]:
                    sender = "👤 Cliente" if msg["sender_type"] == "user" else "🤖 Bot"
                    print(f"     {sender}: {msg['content'][:50]}...")


# ============ Main ============
async def main():
    """Executa todos os exemplos"""
    print("=" * 60)
    print("EXEMPLOS DE USO - Chatbot para Empresas (Python)")
    print("=" * 60)
    
    # Exemplos síncronos
    try:
        example_1_create_user()
    except Exception as e:
        print(f"❌ Erro no Exemplo 1: {e}")
    
    try:
        example_2_create_contact_and_conversation()
    except Exception as e:
        print(f"❌ Erro no Exemplo 2: {e}")
    
    # Exemplos assíncronos
    try:
        await example_3_process_message_with_ai()
    except Exception as e:
        print(f"❌ Erro no Exemplo 3: {e}")
    
    try:
        await example_4_ai_flow_with_langgraph()
    except Exception as e:
        print(f"❌ Erro no Exemplo 4: {e}")
    
    try:
        await example_5_custom_chains()
    except Exception as e:
        print(f"❌ Erro no Exemplo 5: {e}")
    
    try:
        example_6_queue_management()
    except Exception as e:
        print(f"❌ Erro no Exemplo 6: {e}")
    
    try:
        example_7_list_conversations()
    except Exception as e:
        print(f"❌ Erro no Exemplo 7: {e}")
    
    print("\n" + "=" * 60)
    print("EXEMPLOS CONCLUÍDOS")
    print("=" * 60)


if __name__ == "__main__":
    print("\n⚠️  NOTA: Certifique-se de que:")
    print("   1. O PostgreSQL está rodando")
    print("   2. DATABASE_URL está configurada")
    print("   3. OPENAI_API_KEY está configurada (para exemplos de IA)")
    print()
    
    asyncio.run(main())
