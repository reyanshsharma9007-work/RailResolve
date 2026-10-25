from abc import ABC, abstractmethod
from typing import Iterable, Any

class Classifier(ABC):
    @abstractmethod
    def classify(self, title: str, description: str, requested_category=None, requested_department=None) -> dict: ...

class PriorityPredictor(ABC):
    @abstractmethod
    def predict(self, title: str, description: str) -> dict: ...

class DuplicateDetector(ABC):
    @abstractmethod
    def detect(self, text: str, candidates: Iterable[Any]) -> dict: ...

class Summarizer(ABC):
    @abstractmethod
    def summarize(self, title: str, description: str) -> str: ...

class AssistantProvider(ABC):
    @abstractmethod
    def answer(self, question: str, context: dict) -> dict: ...

class TicketExtractor(ABC):
    @abstractmethod
    def extract(self, text: str) -> dict: ...
