"""Export compact, static evaluation artifacts for the Vite dashboard.

This consumes saved historical Random Forest predictions; it never scores in
the browser and deliberately excludes the serialized model from public assets.
"""
from pathlib import Path
import csv, json
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, roc_auc_score, average_precision_score, confusion_matrix

ROOT = Path(__file__).resolve().parents[1]
ARTIFACTS = ROOT / 'artifacts'
PUBLIC = ROOT / 'public' / 'predictive' / 'v1'
PUBLIC.mkdir(parents=True, exist_ok=True)

with (ARTIFACTS / 'late_delivery_v1' / 'test_predictions.csv').open(newline='', encoding='utf-8') as stream:
    source = list(csv.DictReader(stream))

# These are historical order attributes already prepared for the approved
# modelling dataset.  They provide UI context only: the browser never scores
# an order or changes the trained model.
context_fields = {
    'shipping_mode': 'shippingMode',
    'market': 'market',
    'region': 'region',
    'country': 'country',
    'customer_segment': 'customerSegment',
    'category': 'category',
    'quantity': 'quantity',
    'order_value': 'orderValue',
    'order_date': 'orderDate',
}
order_context = {}
with (ROOT / 'prepared_late_delivery_orders.csv').open(newline='', encoding='utf-8') as stream:
    for row in csv.DictReader(stream):
        order_context[str(row['Order Id'])] = {
            output: row[source] for source, output in context_fields.items()
        }

predictions = []
for row in source:
    order_id = str(row['Order Id'])
    context = order_context.get(order_id)
    if context is None:
        raise ValueError(f'Missing prepared order context for prediction {order_id}.')
    predictions.append({
        'orderId': order_id,
        'actual': int(row['actual']),
        'probability': round(float(row['probability']), 8),
        # Retained as the original operating-policy label for reference. The
        # interactive UI always derives simulation classifications from
        # probability and its user-selected retrospective threshold.
        'predicted': int(float(row['probability']) >= .5),
        **context,
    })
y = [row['actual'] for row in predictions]
p = [row['probability'] for row in predictions]
z = [row['predicted'] for row in predictions]
tn, fp, fn, tp = confusion_matrix(y, z, labels=[0, 1]).ravel()

comparison = []
with (ARTIFACTS / 'late_delivery_v1' / 'validation_comparison.csv').open(newline='', encoding='utf-8') as stream:
    for row in csv.DictReader(stream):
        comparison.append({key: (float(value) if key in {'accuracy','precision','recall','f1','roc_auc','average_precision'} else value) for key, value in row.items() if key != 'confusion_matrix'})
importance = []
with (ARTIFACTS / 'late_delivery_v3' / 'permutation_importance.csv').open(newline='', encoding='utf-8') as stream:
    for row in csv.DictReader(stream):
        importance.append({'feature': row['feature'], 'importance': float(row['importance_mean'])})

metadata = {
    'model': 'Random Forest', 'modelVersion': 'late_delivery_v1',
    'predictionTarget': 'Late_delivery_risk for completed orders', 'threshold': .5,
    'unitOfAnalysis': 'Unique order', 'status': 'Research prototype — historical evaluation only',
    'evaluationPeriod': '2017-09-05 to 2018-01-31', 'records': len(predictions),
    'testMetrics': {'accuracy': accuracy_score(y,z), 'precision': precision_score(y,z), 'recall': recall_score(y,z), 'f1': f1_score(y,z), 'rocAuc': roc_auc_score(y,p), 'averagePrecision': average_precision_score(y,p)},
    'confusionMatrix': {'tn': int(tn), 'fp': int(fp), 'fn': int(fn), 'tp': int(tp)},
    'modelComparison': comparison, 'featureImportance': importance,
    'limitations': ['Historical evaluation only; no real-time prediction service.', 'Not production-validated.', 'Shipping mode supplies almost all observed discrimination; this is not causal.', 'Test period was previously accessed during development.', 'Probabilities are uncalibrated.', 'Threshold 0.50 was selected under provisional validation precision and alert-rate constraints.']
}
(PUBLIC / 'historical-predictions.json').write_text(json.dumps(predictions, separators=(',', ':')), encoding='utf-8')
(PUBLIC / 'model-evaluation.json').write_text(json.dumps(metadata, indent=2), encoding='utf-8')
print({'records': len(predictions), 'threshold': .5, 'output': str(PUBLIC)})
