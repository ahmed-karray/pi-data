from __future__ import annotations

from datetime import datetime, timezone
from threading import Lock
from typing import Any

from fastapi import BackgroundTasks, Depends, FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware

from app_web.backend.shared.config import ALLOWED_ORIGINS
from app_web.backend.shared.db import Base, SessionLocal, init_db
from app_web.backend.shared.elk_client import emit_nowait
from app_web.backend.shared.mlflow_store import cleanup_broken_file_store_experiments
from app_web.backend.shared.mlops_bridge import (
    dataset_metadata,
    elk_status,
    feature_drift,
    metrics_over_time,
    performance_drift,
    run_training,
    should_retrain,
)
from app_web.backend.shared.models import User
from app_web.backend.shared.security import require_roles, seed_default_users
from app_web.backend.shared.store import recent_alerts

app = FastAPI(title="IOTinel Monitoring Service", version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

_retrain_lock = Lock()
_retrain_state: dict[str, Any] = {
    "status": "idle",
    "dataset": None,
    "started_at": None,
    "finished_at": None,
    "run": None,
    "error": None,
}


def _utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _snapshot_retrain_state() -> dict[str, Any]:
    with _retrain_lock:
        return dict(_retrain_state)


def _update_retrain_state(**updates: Any) -> None:
    with _retrain_lock:
        _retrain_state.update(updates)


def _run_retraining_job(dataset: str) -> None:
    _update_retrain_state(status="running")
    try:
        result = run_training(dataset, {}, role="data_scientist")
        _update_retrain_state(
            status="completed",
            finished_at=_utc_now_iso(),
            run=result,
            error=None,
        )
    except Exception as exc:
        _update_retrain_state(
            status="failed",
            finished_at=_utc_now_iso(),
            error=str(exc),
        )


@app.on_event("startup")
def startup() -> None:
    init_db(Base)
    cleanup_broken_file_store_experiments()
    with SessionLocal() as db:
        seed_default_users(db)


@app.get("/health")
def health():
    return {"status": "UP", "service": "monitoring_service", "port": 8004}


def _available_datasets() -> list[str]:
    return [item["dataset"] for item in dataset_metadata() if item.get("dataset")]


@app.get("/monitor/drift")
async def drift(_: User = Depends(require_roles("data_scientist", "administrator"))):
    results: dict[str, Any] = {}
    for dataset in _available_datasets():
        feature = await feature_drift(dataset)
        performance = await performance_drift(dataset)
        retrain = await should_retrain(dataset)
        results[dataset] = {
            "feature_drift": feature,
            "performance_drift": performance,
            "should_retrain": retrain,
        }
        drifted_features = [
            item.get("feature")
            for item in feature.get(
                "features", feature if isinstance(feature, list) else []
            )
            if isinstance(item, dict)
            and item.get(
                "drift_detected", item.get("score", 0) > item.get("threshold", 0.15)
            )
        ]
        emit_nowait(
            "6g-ids-drift",
            {
                "service": "monitoring_service",
                "event_type": "drift",
                "level": "info",
                "dataset": dataset,
                "drift_detected": bool(retrain.get("should_retrain")),
                "drifted_features": drifted_features,
                "drift_score": feature.get("drift_score"),
            },
        )
    return results


@app.get("/monitor/metrics")
async def metrics(_: User = Depends(require_roles("data_scientist", "administrator"))):
    return await metrics_over_time()


@app.get("/monitor/alerts")
def alerts(
    user: User = Depends(
        require_roles("security_analyst", "data_scientist", "administrator")
    )
):
    return {"alerts": recent_alerts(), "viewer_role": user.role}


@app.post("/monitor/retrain")
async def retrain(
    background_tasks: BackgroundTasks,
    _: User = Depends(require_roles("data_scientist", "administrator")),
):
    signal = await should_retrain("URLLC")
    if not signal.get("should_retrain"):
        return {
            "status": "skipped",
            "reason": signal.get("reason", "No dataset exceeded the drift threshold"),
        }

    state = _snapshot_retrain_state()
    if state["status"] in {"queued", "running"}:
        return state

    _update_retrain_state(
        status="queued",
        dataset="URLLC",
        started_at=_utc_now_iso(),
        finished_at=None,
        run=None,
        error=None,
    )
    background_tasks.add_task(_run_retraining_job, "URLLC")
    return {"status": "triggered", "dataset": "URLLC"}


@app.get("/monitor/retrain/status")
def retrain_status(_: User = Depends(require_roles("data_scientist", "administrator"))):
    return _snapshot_retrain_state()


@app.get("/monitor/health")
async def monitor_health(
    user: User = Depends(
        require_roles("security_analyst", "data_scientist", "administrator")
    )
):
    return {"status": "UP", "elk": await elk_status(), "viewer_role": user.role}


@app.post("/monitor/alert")
async def monitor_alert(request: Request):
    payload = await request.json()
    emit_nowait(
        "6g-ids-system",
        {
            "service": "monitoring_service",
            "event_type": "health",
            "level": "warning",
            "alert_payload": payload,
        },
    )
    return {"status": "received"}
