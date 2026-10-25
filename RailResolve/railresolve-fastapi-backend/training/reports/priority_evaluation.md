# Model 2 evaluation - `priority-1.0.0`

Artifact `priority-1.0.0.joblib` sha256 `170a895351fa2b3e...` (verified at load).

Official CivicDex **test** split, 60 rows, evaluated once. Labels: ['low', 'medium', 'high']. Abstentions (no usable vocabulary, counted as misses): 1.

| Metric | Full test (n=60) | Without leaked rows (n=52) |
|---|---|---|
| Accuracy | 0.75 (95% CI [0.633, 0.85]) | 0.75 |
| Macro-F1 | 0.7666 (95% CI [0.57, 0.877]) | 0.7539 |
| Weighted-F1 | 0.7618 | 0.7613 |

| Class | Precision | Recall (95% CI) | F1 | Support |
|---|---|---|---|---|
| low | 1.0 | 0.6667 ([0.2, 1.0]) | 0.8 | 6 |
| medium | 0.6 | 0.9 ([0.75, 1.0]) | 0.72 | 20 |
| high | 0.92 | 0.6765 ([0.514, 0.829]) | 0.7797 | 34 |

Confusion matrix (rows = true, cols = predicted, order ['low', 'medium', 'high']):
```
[4, 1, 0]
[0, 18, 2]
[0, 11, 23]
```

```
              precision    recall  f1-score   support

         low       1.00      0.67      0.80         6
      medium       0.60      0.90      0.72        20
        high       0.92      0.68      0.78        34

   micro avg       0.76      0.75      0.76        60
   macro avg       0.84      0.75      0.77        60
weighted avg       0.82      0.75      0.76        60

```

Baselines (accuracy / macro-F1): {"majority_class": [0.5667, 0.2411], "existing_rule_based_predictor": [0.2667, 0.2657]}

Probability quality on test: {'n_scored': 59, 'ece_top_label': 0.0771, 'log_loss': 0.4955, 'brier_multiclass': 0.304, 'reference_log_loss_uniform': 1.0986, 'note': 'n=60, indicative only; see out-of-fold reliability in priority_model_selection.json'}

Severity as a separate target (informational): 0.8331 CV macro-F1; Not used as the priority target. The 4 values describe the KIND of issue (hazard / failure / delay / information query), not a ranked scale, and they strongly imply urgency (see audit), so mixing them would leak the label.

**Limitations:** tiny test set (wide intervals, especially for `low`); civic-domain Chennai data, mostly synthetic; no CRITICAL class; inputs are short English glosses. These numbers do not predict performance on railway complaints and are not a safety validation.
