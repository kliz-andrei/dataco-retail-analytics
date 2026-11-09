"""Server-side inference for the verified DataCo late-delivery model.

The fitted scikit-learn pipeline stays outside ``public/`` and is loaded only
inside this API function.  The React dashboard never receives the serialized
model or the training data.
"""

from __future__ import annotations

import json
import math
import os
from functools import lru_cache
from pathlib import Path
from typing import Any

import joblib
import pandas as pd
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, ConfigDict, Field


ROOT = Path(__file__).resolve().parents[1]
MODEL_PATH = ROOT / "artifacts" / "late_delivery_v1" / "pipeline.joblib"
METADATA_PATH = ROOT / "artifacts" / "late_delivery_v1" / "metadata.json"
FEATURES = [
    "shipping_mode",
    "market",
    "region",
    "country",
    "customer_segment",
    "category",
    "quantity",
    "order_value",
    "order_month",
]
CATEGORICAL_FEATURES = FEATURES[:6]
NUMERIC_FEATURES = FEATURES[6:]


class PredictionRequest(BaseModel):
    """The exact order-placement fields accepted by the fitted pipeline."""

    model_config = ConfigDict(extra="forbid")

    shipping_mode: str = Field(min_length=1)
    market: str = Field(min_length=1)
    region: str = Field(min_length=1)
    country: str = Field(min_length=1)
    customer_segment: str = Field(min_length=1)
    category: str = Field(min_length=1)
    quantity: float = Field(gt=0, le=24)
    order_value: float = Field(ge=0, le=5000)
    order_month: int = Field(ge=1, le=12)


@lru_cache(maxsize=1)
def load_pipeline() -> Any:
    if not MODEL_PATH.is_file():
        raise RuntimeError("The verified late-delivery pipeline is not packaged with this deployment.")
    return joblib.load(MODEL_PATH)


@lru_cache(maxsize=1)
def load_metadata() -> dict[str, Any]:
    if not METADATA_PATH.is_file():
        raise RuntimeError("The verified model metadata is not packaged with this deployment.")
    return json.loads(METADATA_PATH.read_text(encoding="utf-8"))


def _category_values(pipeline: Any) -> dict[str, list[str]]:
    encoder = pipeline.named_steps["preprocess"].named_transformers_["cat"].named_steps["onehot"]
    return {
        feature: [str(value) for value in values]
        for feature, values in zip(CATEGORICAL_FEATURES, encoder.categories_)
    }


def _numeric_defaults(pipeline: Any) -> dict[str, float]:
    imputer = pipeline.named_steps["preprocess"].named_transformers_["num"].named_steps["impute"]
    return {feature: float(value) for feature, value in zip(NUMERIC_FEATURES, imputer.statistics_)}


def _categorical_defaults(pipeline: Any) -> dict[str, str]:
    imputer = pipeline.named_steps["preprocess"].named_transformers_["cat"].named_steps["impute"]
    return {feature: str(value) for feature, value in zip(CATEGORICAL_FEATURES, imputer.statistics_)}


def _validate_values(payload: PredictionRequest, pipeline: Any) -> None:
    supported = _category_values(pipeline)
    for feature in CATEGORICAL_FEATURES:
        value = getattr(payload, feature)
        if value not in supported[feature]:
            raise HTTPException(
                status_code=422,
                detail=f"Unsupported {feature.replace('_', ' ')} value. Choose a value from the model's training schema.",
            )
    for feature in NUMERIC_FEATURES:
        value = float(getattr(payload, feature))
        if not math.isfinite(value):
            raise HTTPException(status_code=422, detail=f"{feature.replace('_', ' ').capitalize()} must be finite.")


def run_prediction(payload: PredictionRequest) -> dict[str, Any]:
    """Run one inference using the same fitted preprocessing and classifier."""

    try:
        pipeline = load_pipeline()
        metadata = load_metadata()
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc

    _validate_values(payload, pipeline)
    frame = pd.DataFrame([{feature: getattr(payload, feature) for feature in FEATURES}], columns=FEATURES)
    probabilities = pipeline.predict_proba(frame)
    classes = list(pipeline.named_steps["model"].classes_)
    positive_index = classes.index(1)
    probability = float(probabilities[0, positive_index])
    threshold = float(metadata.get("threshold", 0.5))
    predicted_late = probability >= threshold
    return {
        "probability": probability,
        "predictedLate": predicted_late,
        "threshold": threshold,
        "model": "Random Forest",
        "modelVersion": "late_delivery_v1",
        "predictionTarget": "Late_delivery_risk for completed orders",
        "interpretation": "Model-estimated historical score; it is not a calibrated guarantee of an individual delivery outcome.",
        "limitations": [
            "Research prototype based on historical DataCo orders.",
            "The score is not a real-time forecasting service and has not been prospectively validated.",
            "Shipping mode provides most observed discrimination in the tested feature set; this does not establish causality.",
        ],
    }


app = FastAPI(title="DataCo Late-Delivery Inference API", version="late_delivery_v1")
frontend_origin = os.getenv("FRONTEND_ORIGIN")
if frontend_origin:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=[frontend_origin],
        allow_methods=["GET", "POST"],
        allow_headers=["Content-Type"],
    )


@app.get("/health")
@app.get("/api/health")
def health() -> dict[str, str]:
    try:
        load_pipeline()
        load_metadata()
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    return {"status": "ok", "modelVersion": "late_delivery_v1"}


@app.get("/options")
@app.get("/api/options")
def options() -> dict[str, Any]:
    try:
        pipeline = load_pipeline()
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    return {
        "features": FEATURES,
        "categorical": _category_values(pipeline),
        "numeric": {
            "defaults": _numeric_defaults(pipeline),
            "limits": {"quantity": {"min": 1, "max": 24}, "order_value": {"min": 0, "max": 5000}, "order_month": {"min": 1, "max": 12}},
        },
        "categoricalDefaults": _categorical_defaults(pipeline),
        "modelVersion": "late_delivery_v1",
    }


@app.post("/")
@app.post("/predict")
@app.post("/api/predict")
def predict(payload: PredictionRequest) -> dict[str, Any]:
    return run_prediction(payload)
