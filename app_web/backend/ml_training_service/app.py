from __future__ import annotations

import asyncio
from datetime import datetime
from threading import Lock
from typing import Any

import mlflow
import pandas as pd
from fastapi import BackgroundTasks, Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app_web.backend.shared.config import ALLOWED_ORIGINS, MLFLOW_TRACKING_URI
from app_web.backend.shared.db import Base, SessionLocal, get_db, init_db
from app_web.backend.shared.elk_client import emit_nowait
from app_web.backend.shared.mlflow_store import cleanup_broken_file_store_experiments
from app_web.backend.shared.mlops_bridge import (
    dataset_metadata,
    get_mlflow_run,
    promote_run,
    run_training,
)
from app_web.backend.shared.models import TrainingRun, User
from app_web.backend.shared.schemas import PromoteResponse, TrainStartRequest
from app_web.backend.shared.security import require_roles, seed_default_users

mlflow.set_tracking_uri(MLFLOW_TRACKING_URI)
app = FastAPI(title="IOTinel ML Training Service", version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

_training_lock = Lock()
_training_jobs: dict[str, dict[str, Any]] = {}


def _append_training_log(job_id: str, message: str) -> None:
    with _training_lock:
        job = _training_jobs.get(job_id)
        if job is None:
            return
        timestamp = datetime.utcnow().strftime("%H:%M:%S")
        job["logs"].append(f"[{timestamp}] {message}")


def _set_training_job(job_id: str, **updates: Any) -> None:
    with _training_lock:
        _training_jobs.setdefault(job_id, {"job_id": job_id, "logs": []})
        _training_jobs[job_id].update(updates)


def _get_training_job(job_id: str) -> dict[str, Any] | None:
    with _training_lock:
        job = _training_jobs.get(job_id)
        return None if job is None else {**job, "logs": list(job.get("logs", []))}


def _persist_training_run(
    db: Session,
    *,
    run_id: str,
    dataset: str,
    model_type: str,
    status: str,
    metrics: dict[str, Any] | None,
    mlflow_run_url: str | None = None,
    notes: str | None = None,
) -> TrainingRun:
    record = db.query(TrainingRun).filter(TrainingRun.run_id == run_id).first()
    payload = {
        "run_id": run_id,
        "dataset": dataset,
        "model_type": model_type,
        "status": status,
        "metrics": metrics or {},
        "notes": notes,
    }
    if record is None:
        record = TrainingRun(**payload)
        db.add(record)
    else:
        record.dataset = dataset
        record.model_type = model_type
        record.status = status
        record.metrics = payload["metrics"]
        record.notes = notes
    if mlflow_run_url:
        record.metrics = {**(record.metrics or {}), "mlflow_run_url": mlflow_run_url}
    db.commit()
    db.refresh(record)
    return record


def _run_training_job(
    job_id: str,
    dataset: str,
    model_type: str,
    hyperparameters: dict[str, Any],
    user_email: str,
    user_role: str,
) -> None:
    _set_training_job(job_id, status="running")
    with SessionLocal() as db:
        _persist_training_run(
            db,
            run_id=job_id,
            dataset=dataset,
            model_type=model_type,
            status="running",
            metrics={"hyperparameters": hyperparameters},
            notes=f"Triggered by {user_email}",
        )
    try:
        _append_training_log(job_id, f"Launching training for {dataset}")
        result = run_training(
            dataset,
            hyperparameters,
            role=user_role,
            model_type=model_type,
            log_callback=lambda line: _append_training_log(job_id, line),
        )
        with SessionLocal() as db:
            _persist_training_run(
                db,
                run_id=result["run_id"],
                dataset=result["dataset"],
                model_type=model_type,
                status="completed",
                metrics=result["metrics"],
                mlflow_run_url=result["mlflow_run_url"],
            )
        _set_training_job(job_id, status="completed", result=result)
        emit_nowait(
            "6g-ids-training",
            {
                "service": "ml_training_service",
                "event_type": "training",
                "level": "info",
                "event": "completed",
                "run_id": result["run_id"],
                "dataset": result["dataset"],
                "metrics": result["metrics"],
                "mlflow_url": result["mlflow_run_url"],
            },
        )
    except Exception as exc:
        with SessionLocal() as db:
            _persist_training_run(
                db,
                run_id=job_id,
                dataset=dataset,
                model_type=model_type,
                status="failed",
                metrics={"hyperparameters": hyperparameters},
                notes=str(exc),
            )
        _append_training_log(job_id, f"Training failed: {exc}")
        _set_training_job(job_id, status="failed", error=str(exc))


@app.on_event("startup")
def startup() -> None:
    init_db(Base)
    cleanup_broken_file_store_experiments()
    with SessionLocal() as db:
        seed_default_users(db)


@app.get("/health")
def health():
    return {"status": "UP", "service": "ml_training_service", "port": 8003}


@app.post("/train/start")
def train_start(
    payload: TrainStartRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles("data_scientist", "administrator")),
):
    model_type = payload.model_type or "LightGBM"
    job_id = f"{payload.dataset.lower()}-{datetime.utcnow().strftime('%Y%m%d%H%M%S')}"
    _set_training_job(job_id, status="queued", logs=[], error=None)
    _persist_training_run(
        db,
        run_id=job_id,
        dataset=payload.dataset,
        model_type=model_type,
        status="queued",
        metrics={"hyperparameters": payload.hyperparameters or {}},
        notes=f"Triggered by {user.email}",
    )
    emit_nowait(
        "6g-ids-training",
        {
            "service": "ml_training_service",
            "event_type": "training",
            "level": "info",
            "event": "started",
            "dataset": payload.dataset,
            "params": payload.hyperparameters or {},
        },
    )
    background_tasks.add_task(
        _run_training_job,
        job_id,
        payload.dataset,
        model_type,
        payload.hyperparameters or {},
        user.email,
        user.role,
    )
    return {
        "run_id": job_id,
        "mlflow_run_url": f"{MLFLOW_TRACKING_URI.rstrip('/')}/#/experiments",
        "status": "queued",
    }


@app.get("/train/runs")
def train_runs(
    db: Session = Depends(get_db),
    _: User = Depends(require_roles("data_scientist", "administrator")),
):
    records = db.query(TrainingRun).order_by(TrainingRun.created_at.desc()).all()
    return [
        {
            "run_id": run.run_id,
            "dataset": run.dataset,
            "model_type": run.model_type,
            "status": run.status,
            "accuracy": float(run.metrics.get("accuracy", 0.0) or 0.0),
            "f1": float(run.metrics.get("f1", run.metrics.get("f1_macro", 0.0)) or 0.0),
            "auc": float(
                run.metrics.get("auc", run.metrics.get("roc_auc", 0.0)) or 0.0
            ),
            "created_at": run.created_at,
            "mlflow_link": run.metrics.get("mlflow_run_url"),
        }
        for run in records
    ]


@app.get("/train/runs/{run_id}")
def train_run_details(
    run_id: str,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles("data_scientist", "administrator")),
):
    record = db.query(TrainingRun).filter(TrainingRun.run_id == run_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Run not found")
    details = get_mlflow_run(run_id)
    return {
        "run_id": run_id,
        "dataset": record.dataset,
        "status": record.status,
        "metrics": details["metrics"],
        "mlflow_run_url": details["mlflow_run_url"],
        "params": details["params"],
    }


@app.get("/train/status/{run_id}")
def train_status(
    run_id: str, _: User = Depends(require_roles("data_scientist", "administrator"))
):
    job = _get_training_job(run_id)
    if not job:
        raise HTTPException(status_code=404, detail="Training job not found")
    return {
        "run_id": run_id,
        "status": job["status"],
        "error": job.get("error"),
    }


@app.get("/train/logs/{run_id}")
async def train_logs(
    run_id: str, _: User = Depends(require_roles("data_scientist", "administrator"))
):
    async def event_stream():
        cursor = 0
        while True:
            job = _get_training_job(run_id)
            if job is None:
                yield 'event: error\ndata: {"message":"Training job not found"}\n\n'
                return
            logs = job.get("logs", [])
            while cursor < len(logs):
                yield f"data: {logs[cursor]}\n\n"
                cursor += 1
            if job["status"] == "completed":
                result = job.get("result") or {}
                yield f"event: done\ndata: {pd.Series(result).to_json()}\n\n"
                return
            if job["status"] == "failed":
                error_message = job.get("error", "Training failed")
                yield ("event: error\n" f'data: {{"message":"{error_message}"}}\n\n')
                return
            await asyncio.sleep(1)

    return StreamingResponse(event_stream(), media_type="text/event-stream")


@app.get("/train/logs_snapshot/{run_id}")
def train_logs_snapshot(
    run_id: str, _: User = Depends(require_roles("data_scientist", "administrator"))
):
    job = _get_training_job(run_id)
    if not job:
        raise HTTPException(status_code=404, detail="Training job not found")
    return {
        "run_id": run_id,
        "status": job["status"],
        "logs": job.get("logs", []),
        "error": job.get("error"),
        "result": job.get("result"),
    }


@app.post("/train/promote/{run_id}", response_model=PromoteResponse)
def train_promote(
    run_id: str,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles("data_scientist", "administrator")),
):
    record = db.query(TrainingRun).filter(TrainingRun.run_id == run_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Run not found")
    details = promote_run(run_id, record.dataset)
    record.status = "completed"
    record.metrics = {**(record.metrics or {}), "is_champion": True, **details}
    db.commit()
    emit_nowait(
        "6g-ids-training",
        {
            "service": "ml_training_service",
            "event_type": "training",
            "level": "info",
            "event": "promoted",
            "run_id": run_id,
            "model_version": details["model_version"],
            "stage": details["stage"],
        },
    )
    return {
        "run_id": run_id,
        "status": details["stage"],
        "auto_rollback_triggered": False,
        "message": f"Model promoted to {details['stage']}.",
    }


@app.get("/train/datasets")
def train_datasets(_: User = Depends(require_roles("data_scientist", "administrator"))):
    return {"datasets": dataset_metadata()}
