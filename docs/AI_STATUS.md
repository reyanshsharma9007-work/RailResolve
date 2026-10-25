# RailResolve AI Status

| Feature | Status | Provider | Data/model status | Limitation |
|---|---|---|---|---|
| Complaint classification | ML_MODEL / HUMAN_REVIEW_REQUIRED (RULE_BASED if model absent) | `HybridCategoryClassifier` (TF-IDF + LinearSVC, `category-svm-1.0.0`) with `RuleBasedClassifier` fallback | Trained on 2,531 de-duplicated complaint tweets; test macro-F1 0.505, accuracy 0.677 (see AI_EVALUATION.md) | Noisy labels; STATION_MAINTENANCE has ~20 weakly-labelled examples; ~31% of test complaints fall below the confidence threshold and go to human review |
| Priority prediction | RULE_BASED (authoritative) + ML advisory (`mlPriority`) | `RuleBasedPriorityPredictor` + Express backend safety policy; `priority-1.0.0` (TF-IDF + calibrated LogReg) trained on CivicDex | No railway priority labels; Model 2 trained on Chennai civic data (test macro-F1 0.767, high-urgency recall 0.68) | Advisory only; AI CRITICAL cannot become final CRITICAL; explicit safety rules always floor `effectivePriority` (see AI_PRIORITY_MODEL.md) |
| Duplicate detection | RULE_BASED_BASELINE | `RuleBasedDuplicateDetector` via `DuplicateDetector` | No supplied railway duplicate labels | Token Jaccard only; not semantic ML and not railway-validated |
| Summarization | RULE_BASED | `RuleBasedSummarizer` via `Summarizer` | No supplied railway summarization dataset | Extractive baseline; no generative model claim |
| RailResolve AI Assistant | RULE_BASED / RAG_READY | `RuleBasedAssistantProvider` via `AssistantProvider`; `RAGProvider`/`LLMProvider` extension points | No supplied Q&A corpus | Current implementation is not RAG; only grounded application knowledge and authorized context |
| Ticket scanner | OCR + RULE_BASED_EXTRACTION / DATA_PENDING | `RuleBasedTicketExtractor` via `TicketExtractor` + OCR | No railway ticket image training dataset | OCR + regex extraction; railway-specific ML validation/training pending; confirmation required before persistence |

## Safety status

Final SLA priority is owned by Express business rules. Passenger-submitted priority is recorded but never passed into the final-priority decision. An AI recommendation of `CRITICAL` alone is rejected to `MEDIUM` and marked for review. `CRITICAL` requires a qualifying safety rule or explicit human escalation approval.

## Data integrity

The railway complaint tweet CSV was supplied later and used to train the category classifier only. Raw data is not stored in the repo. No other component has a trained model.

## Current-state declaration

**2 trained ML models** (complaint category; priority/urgency - advisory, civic-domain data). Other components remain rule-based because no datasets were supplied for them.

Six implemented AI capabilities:
1. Classification — TF-IDF + LinearSVC with rule-based fallback
2. Priority — rule-based
3. Duplicate — Jaccard baseline
4. Summarization — extractive baseline
5. Assistant — grounded rule-based / RAG-ready
6. Ticket scanner — OCR + rule extraction / DATA_PENDING

Future provider implementations can replace the current deterministic providers without changing the Express/React application API contracts.
