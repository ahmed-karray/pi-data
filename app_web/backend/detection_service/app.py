from __future__ import annotations

import io
import os
import time
from typing import Any

import httpx
import numpy as np
import pandas as pd
from fastapi import Depends, FastAPI, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app_web.backend.shared.config import ALLOWED_ORIGINS
from app_web.backend.shared.db import Base, SessionLocal, get_db, init_db
from app_web.backend.shared.elk_client import emit_nowait
from app_web.backend.shared.mlops_bridge import (
    batch_predict,
    dataset_feature_map,
    explain,
    predict,
)
from app_web.backend.shared.models import PredictionRecord, User
from app_web.backend.shared.schemas import DetectPredictRequest
from app_web.backend.shared.security import require_roles, seed_default_users

COHERE_API_KEY = os.getenv("COHERE_API_KEY", "").strip()


class DetectAIExplanationRequest(BaseModel):
    dataset: str
    attack_type: str | None = None
    label: str
    confidence: float
    row: dict[str, Any]


def _json_safe(value: Any) -> Any:
    if isinstance(value, dict):
        return {str(key): _json_safe(item) for key, item in value.items()}
    if isinstance(value, list):
        return [_json_safe(item) for item in value]
    if isinstance(value, tuple):
        return [_json_safe(item) for item in value]
    if isinstance(value, np.ndarray):
        return [_json_safe(item) for item in value.tolist()]
    if isinstance(value, np.generic):
        return value.item()
    return value


async def _cohere_explanation(payload: DetectAIExplanationRequest) -> str:
    if not COHERE_API_KEY:
        return "AI explanation unavailable"

    feature_summary = "\n".join(
        f"  - {key}: {value}" for key, value in list(payload.row.items())[:12]
    )
    system_prompt = (
        "You are a senior network security analyst. "
        "Given a network flow's features and a machine learning prediction, "
        "write a concise, professional 3-sentence explanation of:\n"
        "1. Why this flow was classified as suspicious or malicious.\n"
        "2. Which specific feature values are the strongest indicators.\n"
        "3. What the analyst should do next.\n"
        "Use technical but clear language. No bullet points. Plain paragraph only."
    )
    user_message = (
        f"Dataset: {payload.dataset}\n"
        f"ML Prediction: {payload.label}\n"
        f"Attack Type Classified: {payload.attack_type or 'N/A'}\n"
        f"Model Confidence: {payload.confidence:.1%}\n\n"
        f"Network flow features:\n{feature_summary}\n\n"
        "Explain this prediction."
    )

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                "https://api.cohere.com/v2/chat",
                headers={
                    "Authorization": f"Bearer {COHERE_API_KEY}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": "command-a-03-2025",
                    "messages": [
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": user_message},
                    ],
                },
            )
        response.raise_for_status()
        message = response.json().get("message", {})
        content = message.get("content") or []
        for item in content:
            text = item.get("text")
            if isinstance(text, str) and text.strip():
                return text.strip()
    except Exception:
        return "AI explanation unavailable"

    return "AI explanation unavailable"


app = FastAPI(title="IOTinel Detection Service", version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def startup() -> None:
    init_db(Base)
    with SessionLocal() as db:
        seed_default_users(db)


@app.get("/health")
def health():
    return {"status": "UP", "service": "detection_service", "port": 8002}


@app.get("/detect/datasets")
async def datasets(
    user: User = Depends(
        require_roles("security_analyst", "data_scientist", "administrator")
    )
):
    del user
    features = await dataset_feature_map()
    return [{"dataset": name, "features": items} for name, items in features.items()]


@app.post("/detect/predict")
async def detect_predict(
    payload: DetectPredictRequest,
    db: Session = Depends(get_db),
    user: User = Depends(
        require_roles("security_analyst", "data_scientist", "administrator")
    ),
):
    started = time.perf_counter()
    result = await predict(payload.dataset, payload.features)
    latency_ms = round((time.perf_counter() - started) * 1000, 2)
    db.add(
        PredictionRecord(
            dataset=str(result.get("dataset", payload.dataset)),
            prediction=str(result.get("prediction", "")),
            confidence=float(result.get("confidence", 0.0) or 0.0),
            attack_type=str(result.get("attack_type", "Unknown")),
            requested_by=user.email,
            feature_payload=_json_safe(payload.features),
            shap_payload=_json_safe(result.get("shap_explanation") or []),
        )
    )
    db.commit()
    emit_nowait(
        "6g-ids-predictions",
        {
            "service": "detection_service",
            "event_type": "prediction",
            "level": "info",
            "dataset": result.get("dataset", payload.dataset),
            "prediction_label": result.get("prediction"),
            "confidence": result.get("confidence"),
            "is_attack": str(result.get("prediction", "")).lower() == "malicious",
            "attack_type": result.get("attack_type"),
            "severity": result.get("severity"),
            "user_id": user.id,
            "latency_ms": latency_ms,
            "rolling_accuracy_pct": result.get("rolling_accuracy_pct"),
        },
    )
    return result


@app.post("/detect/explain")
async def detect_explain(
    payload: DetectPredictRequest,
    user: User = Depends(
        require_roles("security_analyst", "data_scientist", "administrator")
    ),
):
    del user
    return await explain(payload.dataset, payload.features)


@app.post("/detect/ai-explanation")
async def detect_ai_explanation(
    payload: DetectAIExplanationRequest,
    user: User = Depends(
        require_roles("security_analyst", "data_scientist", "administrator")
    ),
):
    del user
    return {"explanation": await _cohere_explanation(payload)}


@app.api_route("/detect/batch", methods=["GET", "POST"])
async def detect_batch(
    dataset: str | None = None,
    file: UploadFile | None = File(default=None),
    user: User = Depends(require_roles("security_analyst", "administrator")),
):
    del user
    if file is None:
        return {
            "message": "Upload a CSV with POST /detect/batch to run batch analysis.",
            "supported_datasets": list((await dataset_feature_map()).keys()),
        }
    content = await file.read()
    frame = pd.read_csv(io.StringIO(content.decode("utf-8")))
    return await batch_predict(dataset or "eMBB", frame)


@app.get("/detect/history")
def detect_history(
    db: Session = Depends(get_db),
    _: User = Depends(require_roles("security_analyst", "administrator")),
):
    records = (
        db.query(PredictionRecord)
        .order_by(PredictionRecord.created_at.desc())
        .limit(100)
        .all()
    )
    return [
        {
            "id": record.id,
            "dataset": record.dataset,
            "prediction": record.prediction,
            "confidence": record.confidence,
            "attack_type": record.attack_type,
            "requested_by": record.requested_by,
            "used_features": list(record.feature_payload.keys()),
            "created_at": record.created_at,
        }
        for record in records
    ]
