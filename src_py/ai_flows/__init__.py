"""AI Flows module - Orquestração de fluxos de IA com LangChain e LangGraph"""
from src_py.ai_flows.manager import AIFlowsManager, ConversationState, RouteClassifier, get_ai_manager
from src_py.ai_flows.chains import (
    ProductRecommendationChain,
    SupportTicketAnalyzerChain,
    ConversationSummarizerChain,
    HandoffEvaluatorChain,
    get_chains
)

__all__ = [
    "AIFlowsManager",
    "ConversationState",
    "RouteClassifier",
    "get_ai_manager",
    "ProductRecommendationChain",
    "SupportTicketAnalyzerChain",
    "ConversationSummarizerChain",
    "HandoffEvaluatorChain",
    "get_chains",
]
