# Interactive Late-Delivery Risk Estimator

## Architecture

The Predictive Analytics workspace now separates two workflows:

1. **Historical evaluation** continues to read the verified JSON artifacts in `public/predictive/v1/` and powers the saved test-period charts, threshold simulator, confusion matrix, and order inspector.
2. **Interactive inference** sends order-placement fields from React to `api/predict.py`. The FastAPI function loads `artifacts/late_delivery_v1/pipeline.joblib` server-side, applies the fitted preprocessing, and returns the positive-class score and the documented 0.50 classification threshold.

The serialized model is not placed under `public/` and is never bundled into the browser. The frontend receives only the feature schema, a prediction response, and explicit research-prototype limitations.

## Verified input schema

The request contains exactly the nine predictors used when `late_delivery_v1` was trained:

`shipping_mode`, `market`, `region`, `country`, `customer_segment`, `category`, `quantity`, `order_value`, and `order_month`.

Categorical values are taken from the fitted `OneHotEncoder` categories. Numeric values are validated before inference (`quantity` 0–24, `order_value` 0–5000, `order_month` 1–12). Identifiers, delivery outcomes, actual shipping days, dates, and other post-outcome fields are rejected by the request schema.

The form defaults are the fitted training imputer's most-frequent categorical values and numeric medians. They are convenience defaults, not a representation of a real customer order.

## Local development

Install the API dependencies into the project environment, then start the API and Vite dev server in separate terminals. Install the development overlay when running the parity test:

```powershell
python -m pip install -r requirements.txt
python -m pip install -r requirements-inference-dev.txt
python -m uvicorn api.predict:app --port 8000
npm run dev
```

`vite.config.ts` proxies `/api` to `http://127.0.0.1:8000`, so the browser uses the same `/api/options` and `/api/predict` paths locally and on Vercel.

## Deployment

The repository includes `vercel.json`, a Python runtime pin (`.python-version`), and a minimal `requirements.txt`. Vercel should build the `api/**/*.py` function from the repository root. `excludeFiles` keeps the 180K-row CSV, notebooks, temporary exports, and unrelated model variants out of the Python function bundle while retaining the verified `late_delivery_v1` pipeline and metadata.

Set `FRONTEND_ORIGIN` only when the API is hosted on a different origin. A same-project Vercel deployment uses same-origin requests and does not require wildcard CORS.

## Interpretation and limitations

The returned value is a model-estimated historical score from an uncalibrated Random Forest, not a guaranteed real-world probability or a delivery-time estimate. The endpoint does not retrain the model, select a new threshold, or claim prospective operational benefit. Shipping mode dominates the documented robustness experiment; that association is not causal. Historical metrics and the interactive score must therefore be interpreted separately.
