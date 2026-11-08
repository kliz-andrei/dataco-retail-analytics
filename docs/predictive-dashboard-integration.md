# Predictive dashboard integration

## Route and architecture

The eighth hash workspace is `#predictive-analytics`. `Dashboard.tsx` retains the existing seven workspaces and renders `PredictiveAnalytics` as an isolated page. It is intentionally separate from global retail filters: those filters operate on item-level retail records, while this page reports a fixed, order-level historical test evaluation. The page states this distinction rather than presenting filtered model metrics as if they were re-evaluated predictions.

## Static deployment artifacts

`public/predictive/v1/historical-predictions.json` contains 9,435 actual historical test records with only `orderId`, actual class, saved Random Forest probability, and the threshold-0.50 prediction. `public/predictive/v1/model-evaluation.json` contains model identity, test metrics, confusion matrix, validation comparison, feature importance, and limitations. The browser only reads these artifacts; it does not contain a Python model or score new orders.

Run `python notebooks/export_frontend_prediction_artifacts.py` from the repository root using `.venv-ml` to regenerate them from the saved evaluation artifacts. The script recalculates the displayed test metrics and thresholded labels from saved probabilities. It does not fabricate probabilities or use frontend heuristics.

## Displayed historical results

The page displays Random Forest `late_delivery_v1`, an order-level `Late_delivery_risk` target, and operating threshold 0.50. For the 2017-09-05 to 2018-01-31 historical test period, ROC-AUC is 0.7462, precision is 83.81%, recall is 58.91%, and F1 is 69.18%. It displays the actual 3,388 TN, 618 FP, 2,231 FN, and 3,198 TP confusion-matrix cells.

## Limitations

This is historical research evaluation, not a real-time prediction service or a production-validated model. Probabilities are uncalibrated; the test period was previously accessed during development; and shipping mode supplies almost all measured discrimination. The association must not be interpreted as causal or as evidence that deployment improves delivery performance.
