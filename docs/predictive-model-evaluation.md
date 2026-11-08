# Predictive model evaluation

## Executed configuration

Order-level late-delivery prediction used 62,897 non-canceled historical orders. The chronological train/validation/test split was 44,027 / 9,435 / 9,435 orders. The approved input schema is shipping mode, market, region, country, customer segment, category, quantity, order value, and order month. Outcome-derived fields, actual shipping days, identifiers, delivery status, and scheduled shipping days were excluded.

## Model and threshold

The Random Forest had the strongest validation ROC-AUC (0.7437) among non-baseline candidates. The provisional threshold is 0.50, selected on validation using maximum F1 subject to precision at least 70% and an alert rate between 10% and 70%. Validation: precision 82.70%, recall 59.37%, F1 69.12%, specificity 83.53%, with 3,862 alerts, 3,194 TP, 668 FP, and 2,186 FN.

## Calibration and interpretation

Uncalibrated validation Brier score is 0.1985 and log loss is 0.5805. No calibrated variant was fitted because no temporally separate calibration partition was reserved; fitting calibration on validation would contaminate threshold/model assessment. Validation permutation importance by ROC-AUC places shipping mode first (0.2407 mean decrease), followed by country (0.0017), region (0.0016), and category (0.0012). Importance is associative, may be affected by correlated features, and is not causal.

## Limitations

The test period was examined in the preceding phase and is no longer a fully untouched holdout. Do not use this configuration for production decisions without a new future holdout, operational alert-capacity requirements, and externally validated feature availability at order placement.

## Phase D.6 notebook reproducibility

On 2026-11-08, `notebooks/DataCo_Late_Delivery_Prediction.ipynb` was executed end-to-end with Python 3.14.6 from `.venv-ml`, using pandas 2.3.3, scikit-learn 1.9.1, nbclient 0.11.0, nbformat 5.11.1, and ipykernel 7.4.0. The executed copy is `notebooks/DataCo_Late_Delivery_Prediction_Executed.ipynb`. It uses the repository-relative source filename `DataCo_Retail_Processed.csv` locally and uses a Colab upload only when that file is not locally present.

The notebook reproduced 62,897 non-canceled orders, a late-delivery rate of 57.3127%, and the chronological 44,027 / 9,435 / 9,435 train/validation/test partitions. It verifies a consistent order-level target before aggregation and retains only pre-outcome features.

Validation results were: majority baseline ROC-AUC 0.5000, precision 57.02%, recall 100.00%, F1 72.63%; Logistic Regression ROC-AUC 0.7396, precision 83.85%, recall 57.21%, F1 68.01%; Decision Tree ROC-AUC 0.7371, precision 83.24%, recall 56.97%, F1 67.65%; and Random Forest ROC-AUC 0.7437, precision 82.70%, recall 59.37%, F1 69.12%. The Random Forest threshold policy again selected 0.50 on validation only. Its historical test disclosure at that threshold was ROC-AUC 0.7462, precision 83.81%, recall 58.91%, F1 69.18%, and an alert rate of 40.45%.

The validation robustness experiment produced ROC-AUC 0.7437 for all approved features, 0.7436 for shipping mode only, and 0.5073 after removing shipping mode. This confirms that shipping mode supplies nearly all observed discrimination in this configuration; it is an association rather than evidence of causality. The notebook Logistic Regression accuracy (69.3164%) differed by 0.01 percentage points from the earlier recorded run, while the selected Random Forest result and threshold reproduced at the reported precision, recall, F1, and ROC-AUC precision.
