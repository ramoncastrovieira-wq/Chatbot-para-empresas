"""
Chains customizadas com LangChain para diferentes cenários
"""
from langchain.chat_models import ChatOpenAI
from langchain.prompts import ChatPromptTemplate, PromptTemplate
from langchain_core.output_parsers import StrOutputParser, JsonOutputParser
from langchain_core.runnables import RunnablePassthrough
from typing import Dict, Any, List
from src_py.config import settings


class ProductRecommendationChain:
    """Chain para recomendações de produtos"""
    
    def __init__(self, llm: ChatOpenAI):
        self.llm = llm
        self.chain = self._build_chain()
    
    def _build_chain(self):
        """Constrói a chain de recomendação"""
        template = """
        Você é um especialista em autopeças. Com base na necessidade do cliente, recomende produtos.
        
        Necessidade do cliente: {customer_need}
        Histórico de compras anterior: {purchase_history}
        Orçamento: {budget}
        
        Recomende 3 produtos com:
        - Nome do produto
        - Preço aproximado
        - Por que é adequado
        - Benefícios principais
        
        Responda de forma amigável e profissional.
        """
        
        prompt = ChatPromptTemplate.from_template(template)
        chain = prompt | self.llm | StrOutputParser()
        return chain
    
    async def recommend(self, customer_need: str, purchase_history: str = "", budget: str = "sem limite") -> str:
        """Gera recomendações"""
        result = await self.chain.ainvoke({
            "customer_need": customer_need,
            "purchase_history": purchase_history,
            "budget": budget
        })
        return result


class SupportTicketAnalyzerChain:
    """Chain para análise de tickets de suporte"""
    
    def __init__(self, llm: ChatOpenAI):
        self.llm = llm
        self.chain = self._build_chain()
    
    def _build_chain(self):
        """Constrói a chain de análise"""
        template = """
        Analise este ticket de suporte e extraia informações estruturadas:
        
        {ticket_content}
        
        Retorne um JSON com:
        {{
            "issue_type": "técnico|administrativo|comercial",
            "severity": "baixa|média|alta|crítica",
            "suggested_solution": "descrição breve",
            "requires_escalation": true/false,
            "customer_sentiment": "positivo|neutro|negativo"
        }}
        """
        
        prompt = PromptTemplate.from_template(template)
        chain = prompt | self.llm | JsonOutputParser()
        return chain
    
    async def analyze(self, ticket_content: str) -> Dict[str, Any]:
        """Analisa ticket"""
        result = await self.chain.ainvoke({"ticket_content": ticket_content})
        return result


class ConversationSummarizerChain:
    """Chain para sumarizar conversas"""
    
    def __init__(self, llm: ChatOpenAI):
        self.llm = llm
        self.chain = self._build_chain()
    
    def _build_chain(self):
        """Constrói a chain de sumarização"""
        template = """
        Resuma a seguinte conversa em pontos-chave (máximo 3-4 pontos):
        
        {conversation}
        
        Foque em:
        - Problema/Necessidade principais
        - Solução proposta/oferecida
        - Próximos passos
        - Informações importantes para seguimento
        """
        
        prompt = ChatPromptTemplate.from_template(template)
        chain = prompt | self.llm | StrOutputParser()
        return chain
    
    async def summarize(self, conversation: str) -> str:
        """Sumariza conversa"""
        result = await self.chain.ainvoke({"conversation": conversation})
        return result


class HandoffEvaluatorChain:
    """Chain para avaliar necessidade de transferência para atendente humano"""
    
    def __init__(self, llm: ChatOpenAI):
        self.llm = llm
        self.chain = self._build_chain()
    
    def _build_chain(self):
        """Constrói a chain de avaliação"""
        template = """
        Determine se esta conversa deve ser transferida para um atendente humano:
        
        Mensagem do cliente: {message}
        Histórico: {history}
        Tentativas anteriores de resolução: {previous_attempts}
        
        Retorne um JSON com:
        {{
            "should_handoff": true/false,
            "reason": "motivo da decisão",
            "department": "vendas|suporte|financeiro|outro",
            "urgency": "baixa|média|alta",
            "suggested_next_step": "descrição"
        }}
        """
        
        prompt = PromptTemplate.from_template(template)
        chain = prompt | self.llm | JsonOutputParser()
        return chain
    
    async def evaluate(self, message: str, history: str = "", previous_attempts: str = "") -> Dict[str, Any]:
        """Avalia necessidade de handoff"""
        result = await self.chain.ainvoke({
            "message": message,
            "history": history,
            "previous_attempts": previous_attempts
        })
        return result


def get_chains(llm: ChatOpenAI) -> Dict[str, Any]:
    """Factory para obter todas as chains"""
    return {
        "recommendation": ProductRecommendationChain(llm),
        "support_analyzer": SupportTicketAnalyzerChain(llm),
        "summarizer": ConversationSummarizerChain(llm),
        "handoff_evaluator": HandoffEvaluatorChain(llm),
    }
