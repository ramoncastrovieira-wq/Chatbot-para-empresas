"""
Fluxos de IA com LangChain e LangGraph
Integração com modelos LLM para processamento de conversas
"""
from typing import Dict, Any, List, Optional
from langchain.chat_models import ChatOpenAI
from langchain.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain.chains import LLMChain
from langchain.memory import ConversationBufferMemory
from langchain_core.messages import BaseMessage, HumanMessage, AIMessage, SystemMessage
from langchain_core.output_parsers import StrOutputParser, JsonOutputParser
from langgraph.graph import StateGraph, END
from langgraph.graph.message import add_messages
from pydantic import BaseModel, Field

from src_py.config import settings


class ConversationState(BaseModel):
    """Estado de uma conversa no LangGraph"""
    messages: List[Dict[str, str]] = Field(default_factory=list)
    conversation_id: int
    contact_phone: str
    contact_name: Optional[str] = None
    metadata: Dict[str, Any] = Field(default_factory=dict)
    status: str = "active"


class AIFlowsManager:
    """Manager para orquestrar fluxos de IA com LangChain e LangGraph"""
    
    def __init__(self):
        """Inicializa o manager com modelos LLM"""
        if not settings.OPENAI_API_KEY:
            raise ValueError("OPENAI_API_KEY não configurada")
        
        self.llm = ChatOpenAI(
            model_name=settings.LLM_MODEL,
            api_key=settings.OPENAI_API_KEY,
            temperature=0.7,
        )
        
        # Memória de conversa
        self.memory = ConversationBufferMemory(
            return_messages=True,
            memory_key="chat_history"
        )
        
        # Construir o grafo de conversa
        self.conversation_graph = self._build_conversation_graph()
    
    def _build_conversation_graph(self) -> StateGraph:
        """Constrói o grafo de fluxo de conversa com LangGraph"""
        
        workflow = StateGraph(ConversationState)
        
        # Nós do fluxo
        workflow.add_node("process_message", self._process_message_node)
        workflow.add_node("route_intent", self._route_intent_node)
        workflow.add_node("generate_response", self._generate_response_node)
        workflow.add_node("save_interaction", self._save_interaction_node)
        
        # Arestas (transições)
        workflow.add_edge("process_message", "route_intent")
        workflow.add_edge("route_intent", "generate_response")
        workflow.add_edge("generate_response", "save_interaction")
        workflow.add_edge("save_interaction", END)
        
        # Nó inicial
        workflow.set_entry_point("process_message")
        
        return workflow.compile()
    
    async def _process_message_node(self, state: ConversationState) -> ConversationState:
        """Nó 1: Processa e normaliza mensagem de entrada"""
        if not state.messages:
            return state
        
        # Pega última mensagem do usuário
        last_message = state.messages[-1]
        print(f"[LOG] Processando mensagem de {state.contact_phone}: {last_message.get('content', '')}")
        
        return state
    
    async def _route_intent_node(self, state: ConversationState) -> ConversationState:
        """Nó 2: Identifica intenção da mensagem"""
        last_message = state.messages[-1] if state.messages else {}
        user_input = last_message.get("content", "")
        
        # Prompt para classificação de intenção
        intent_prompt = ChatPromptTemplate.from_template("""
        Analise a mensagem do usuário e classifique em uma das seguintes intenções:
        - product_inquiry: pergunta sobre produtos
        - support: solicitação de suporte
        - order_status: consulta de pedido
        - greeting: saudação
        - other: outro tipo
        
        Mensagem: {user_input}
        
        Responda APENAS com a intenção em lowercase.
        """)
        
        chain = intent_prompt | self.llm | StrOutputParser()
        intent = chain.invoke({"user_input": user_input})
        
        state.metadata["intent"] = intent.strip().lower()
        print(f"[LOG] Intenção detectada: {state.metadata['intent']}")
        
        return state
    
    async def _generate_response_node(self, state: ConversationState) -> ConversationState:
        """Nó 3: Gera resposta baseada no contexto e intenção"""
        
        # Construir contexto de conversa
        chat_history = [
            HumanMessage(content=msg["content"]) if msg["role"] == "user"
            else AIMessage(content=msg["content"])
            for msg in state.messages[:-1]  # Exclui última mensagem que será respondida
        ]
        
        # Sistema de prompt baseado na intenção
        intent = state.metadata.get("intent", "other")
        
        system_prompt = self._get_system_prompt(intent, state)
        
        messages = [
            SystemMessage(content=system_prompt),
            *chat_history,
            HumanMessage(content=state.messages[-1]["content"] if state.messages else "")
        ]
        
        # Invocar LLM
        response = self.llm.invoke(messages)
        
        # Adicionar resposta ao estado
        state.messages.append({
            "role": "assistant",
            "content": response.content
        })
        
        state.metadata["response_generated"] = True
        print(f"[LOG] Resposta gerada: {response.content[:100]}...")
        
        return state
    
    def _get_system_prompt(self, intent: str, state: ConversationState) -> str:
        """Retorna prompt do sistema baseado na intenção"""
        
        prompts = {
            "product_inquiry": """Você é um assistente de vendas para uma empresa de autopeças.
            Responda perguntas sobre produtos de forma amigável e informativa.
            Oferça recomendações quando apropriado.""",
            
            "support": """Você é um agente de suporte ao cliente para uma empresa de autopeças.
            Ajude o cliente com seus problemas de forma empática e profissional.
            Se necessário, encaminhe para um atendente humano.""",
            
            "order_status": """Você é um assistente de rastreamento de pedidos.
            Forneça informações sobre status de pedidos e entregas.
            Use os dados disponíveis para dar respostas precisas.""",
            
            "greeting": """Você é um assistente amigável de atendimento ao cliente.
            Receba o cliente de forma calorosa e pergunte como pode ajudar.""",
            
            "other": """Você é um assistente de atendimento ao cliente útil e amigável.
            Responda às perguntas do cliente da melhor forma possível.""",
        }
        
        return prompts.get(intent, prompts["other"])
    
    async def _save_interaction_node(self, state: ConversationState) -> ConversationState:
        """Nó 4: Salva interação no banco de dados (implementado em repository)"""
        state.metadata["saved"] = True
        print(f"[LOG] Interação marcada para salvar (conversation_id={state.conversation_id})")
        return state
    
    async def process_conversation(self, state: ConversationState) -> ConversationState:
        """
        Processa conversa através do grafo de fluxo
        """
        result = self.conversation_graph.invoke(state)
        return ConversationState(**result)


class RouteClassifier:
    """Classifica e roteia conversas para atendentes apropriados"""
    
    def __init__(self, llm: ChatOpenAI):
        self.llm = llm
    
    async def classify_and_route(self, message_content: str, conversation_history: List[str]) -> Dict[str, Any]:
        """
        Classifica mensagem e sugere roteamento
        """
        prompt = ChatPromptTemplate.from_template("""
        Analise a conversa e classifique o nível de complexidade e urgência:
        
        Histórico: {history}
        Mensagem atual: {current_message}
        
        Retorne um JSON com:
        {{
            "complexity": "low|medium|high",
            "urgency": "low|medium|high",
            "requires_human": true|false,
            "department": "vendas|suporte|financeiro|outro",
            "confidence": 0.0-1.0
        }}
        """)
        
        chain = prompt | self.llm | JsonOutputParser()
        
        result = await chain.ainvoke({
            "history": "\n".join(conversation_history[-5:]),
            "current_message": message_content
        })
        
        return result


# Instância global (singleton)
_ai_manager: Optional[AIFlowsManager] = None


def get_ai_manager() -> AIFlowsManager:
    """Factory para obter instância do AI manager"""
    global _ai_manager
    if _ai_manager is None:
        _ai_manager = AIFlowsManager()
    return _ai_manager
