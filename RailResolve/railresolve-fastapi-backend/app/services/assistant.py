from app.providers.rule_based import RuleBasedAssistantProvider

class RAGProvider:
    def answer(self, question, context):
        raise NotImplementedError("RAG provider is an extension point; no RAG corpus is supplied.")

class LLMProvider:
    def answer(self, question, context):
        raise NotImplementedError("LLM provider is an extension point; no external LLM is required for the baseline.")

provider = RuleBasedAssistantProvider()

def answer_question(question, context):
    return provider.answer(question, context)
