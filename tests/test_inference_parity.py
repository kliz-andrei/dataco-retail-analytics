"""Parity checks for the server-side estimator and the fitted pipeline."""

from pathlib import Path
import sys

import joblib
import pandas as pd
from fastapi.testclient import TestClient

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from api.predict import FEATURES, app


PIPELINE = joblib.load(ROOT / "artifacts" / "late_delivery_v1" / "pipeline.joblib")
DATA = pd.read_csv(ROOT / "prepared_late_delivery_orders.csv")
client = TestClient(app)


def payload_for(index: int) -> dict[str, object]:
    row = DATA.iloc[index]
    return {
        "shipping_mode": str(row["shipping_mode"]),
        "market": str(row["market"]),
        "region": str(row["region"]),
        "country": str(row["country"]),
        "customer_segment": str(row["customer_segment"]),
        "category": str(row["category"]),
        "quantity": float(row["quantity"]),
        "order_value": float(row["order_value"]),
        "order_month": int(row["order_month"]),
    }


def test_api_matches_direct_pipeline_predictions() -> None:
    for index in (0, 100, 1000, 10000):
        payload = payload_for(index)
        response = client.post("/api/predict", json=payload)
        assert response.status_code == 200, response.text
        api_result = response.json()
        direct = float(PIPELINE.predict_proba(pd.DataFrame([payload], columns=FEATURES))[0, 1])
        assert abs(api_result["probability"] - direct) < 1e-12
        assert api_result["predictedLate"] is (direct >= 0.5)


def test_api_rejects_unknown_categories_and_post_outcome_fields() -> None:
    payload = payload_for(0)
    unknown = {**payload, "shipping_mode": "Unknown shipping mode"}
    assert client.post("/api/predict", json=unknown).status_code == 422
    extra = {**payload, "late_delivery": 1}
    assert client.post("/api/predict", json=extra).status_code == 422


if __name__ == "__main__":
    test_api_matches_direct_pipeline_predictions()
    test_api_rejects_unknown_categories_and_post_outcome_fields()
    print("Inference parity checks passed for four historical feature rows; invalid and post-outcome inputs were rejected.")
