# AI Dataset Mapping

| Intended data | Intended use | Current status |
|---|---|---|
| Railway complaint tweets | Complaint classification | USED — `category-svm-1.0.0` (Type -> department map in `training/category_label_map.py`) |
| Generic urgency/support data | Not valid railway priority ground truth | Deliberately not used |
| CivicDex (Chennai civic requests) | Priority/urgency (Model 2) | USED as advisory-only training data; not railway; license unverified |
| Quora duplicate questions | Generic duplicate evaluation | DATA_PENDING; component-aware split required |
| Generic summarization data | Baseline summarization experiment | DATA_PENDING |
| Indian Railways Q&A | Assistant/RAG corpus | DATA_PENDING |
| Ticket images | Ticket OCR training | DATA_PENDING; none supplied |

Department codes remain distinct from user-facing complaint categories. The rule-based classifier never silently maps an unsupported category to an unrelated department.
