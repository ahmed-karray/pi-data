from __future__ import annotations

import asyncio
from datetime import datetime, timezone
import logging
from pathlib import Path
import shutil
import sys
from typing import Any, Callable

import httpx
import mlflow
from mlflow.tracking import MlflowClient
import pandas as pd

from .config import (
    MLFLOW_TRACKING_URI,
    MLOPS_API_BASE,
    MLOPS_API_LOCAL,
    MLOPS_DIR,
)

logger = logging.getLogger(__name__)

RETRY_ATTEMPTS = 3
RETRY_BACKOFF_SECONDS = 0.5
HTTP_TIMEOUT = 30.0
TRAINING_EXPERIMENT = "6G-IDS-WebPlatform"
CHAMPION_MODEL_NAME = "6G-IDS-Champion"


def _utc_now() -> datetime:
    return datetime.now(timezone.utc)


def _ensure_mlops_import_path() -> None:
    candidate_paths = [
        Path("/workspace/mlops"),
        Path("/workspace/MLOPS"),
        MLOPS_DIR,
    ]
    for candidate in candidate_paths:
        candidate_str = str(candidate)
        if candidate.exists() and candidate_str not in sys.path:
            sys.path.insert(0, candidate_str)


def _model_pipeline_exports() -> dict[str, Any]:
    _ensure_mlops_import_path()
    from model_pipeline import (  # type: ignore
        DATASET_FILES,
        FEATURE_MAP,
        load_dataset,
        model_path_for,
        normalize_dataset_name,
        resolve_dataset_path,
        train_model,
    )

    return {
        "DATASET_FILES": DATASET_FILES,
        "FEATURE_MAP": FEATURE_MAP,
        "load_dataset": load_dataset,
        "model_path_for": model_path_for,
        "normalize_dataset_name": normalize_dataset_name,
        "resolve_dataset_path": resolve_dataset_path,
        "train_model": train_model,
    }


def _candidate_api_bases() -> list[str]:
    candidates = [MLOPS_API_BASE, MLOPS_API_LOCAL]
    unique: list[str] = []
    for candidate in candidates:
        if candidate and candidate not in unique:
            unique.append(candidate.rstrip("/"))
    return unique


async def _request(method: str, path: str, **kwargs: Any) -> Any:
    last_error: Exception | None = None
    for base_url in _candidate_api_bases():
        url = f"{base_url}{path}"
        for attempt in range(1, RETRY_ATTEMPTS + 1):
            try:
                async with httpx.AsyncClient(timeout=HTTP_TIMEOUT) as client:
                    response = await client.request(method, url, **kwargs)
                response.raise_for_status()
                return response.json()
            except (httpx.HTTPError, ValueError) as exc:
                last_error = exc
                logger.warning(
                    "MLOPS request failed %s %s on attempt %s/%s: %s",
                    method,
                    url,
                    attempt,
                    RETRY_ATTEMPTS,
                    exc,
                )
                if attempt < RETRY_ATTEMPTS:
                    await asyncio.sleep(RETRY_BACKOFF_SECONDS * attempt)
    raise RuntimeError(
        f"MLOPS API request failed for {method} {path}: {last_error}"
    ) from last_error


def _coerce_samples(records: Any) -> list[dict[str, Any]]:
    if isinstance(records, pd.DataFrame):
        return records.fillna("").to_dict(orient="records")
    if isinstance(records, list):
        return records
    raise TypeError("records must be a pandas DataFrame or a list of dictionaries")


async def predict(dataset: str, features: dict[str, Any]) -> dict[str, Any]:
    return await _request(
        "POST", "/predict", json={"dataset": dataset, "features": features}
    )


async def batch_predict(dataset: str, records: Any) -> dict[str, Any]:
    return await _request(
        "POST",
        "/predict/batch",
        json={"dataset": dataset, "samples": _coerce_samples(records)},
    )


async def explain(dataset: str, features: dict[str, Any]) -> dict[str, Any]:
    return await _request(
        "POST", "/explain", json={"dataset": dataset, "features": features}
    )


async def feature_drift(dataset: str) -> dict[str, Any]:
    return await _request("GET", f"/drift/features/{dataset}")


async def performance_drift(dataset: str) -> dict[str, Any]:
    return await _request("GET", f"/drift/performance/{dataset}")


async def should_retrain(dataset: str) -> dict[str, Any]:
    return await _request("GET", f"/drift/retrain/{dataset}")


async def list_models() -> dict[str, Any]:
    return await _request("GET", "/models")


async def metrics_over_time() -> dict[str, Any]:
    return await _request("GET", "/stats/timeline")


async def recent_stats() -> dict[str, Any]:
    return await _request("GET", "/stats/recent")


async def attack_stats() -> dict[str, Any]:
    return await _request("GET", "/stats/attacks")


async def dataset_stats() -> dict[str, Any]:
    return await _request("GET", "/stats/datasets")


async def summary_stats() -> dict[str, Any]:
    return await _request("GET", "/stats/summary")


async def health() -> dict[str, Any]:
    return await _request("GET", "/health")


async def elk_status() -> dict[str, Any]:
    return await _request("GET", "/elk/status")


async def dataset_feature_map() -> dict[str, list[str]]:
    payload = await list_models()
    models = payload.get("models", {})
    return {
        dataset: list(metadata.get("features") or [])
        for dataset, metadata in models.items()
        if metadata.get("file_exists") or metadata.get("features")
    }


def dataset_metadata() -> list[dict[str, Any]]:
    exports = _model_pipeline_exports()
    feature_map = exports["FEATURE_MAP"]
    load_dataset = exports["load_dataset"]
    normalize_dataset_name = exports["normalize_dataset_name"]
    resolve_dataset_path = exports["resolve_dataset_path"]
    output: list[dict[str, Any]] = []
    for dataset in ["eMBB", "mMTC", "URLLC", "TON_IoT"]:
        normalized = normalize_dataset_name(dataset)
        try:
            data_path = resolve_dataset_path(normalized)
            _, df = load_dataset(normalized)
        except FileNotFoundError:
            logger.warning(
                "Skipping dataset metadata for %s because its source file is missing",
                normalized,
            )
            continue
        label_series = df["Label"].astype(str)
        balance = label_series.value_counts(normalize=True).round(4).to_dict()
        output.append(
            {
                "dataset": normalized,
                "rows": int(len(df)),
                "features": len(feature_map[normalized]),
                "class_balance": {str(k): float(v) for k, v in balance.items()},
                "feature_list": feature_map[normalized],
                "file_size_bytes": (
                    data_path.stat().st_size if data_path.exists() else 0
                ),
            }
        )
    return output


def challenger_bundle_path(run_id: str) -> Path:
    return MLOPS_DIR / f"{run_id}.joblib"


def run_training(
    dataset: str,
    params: dict[str, Any] | None = None,
    role: str = "data_scientist",
    triggered_by: str = "web_ui",
    run_name: str | None = None,
    log_callback: Callable[[str], None] | None = None,
) -> dict[str, Any]:
    _ensure_mlops_import_path()

    exports = _model_pipeline_exports()
    normalize_dataset_name = exports["normalize_dataset_name"]
    train_model = exports["train_model"]

    normalized = normalize_dataset_name(dataset)
    hyperparameters = dict(params or {})
    mlflow.set_tracking_uri(MLFLOW_TRACKING_URI)
    mlflow.set_experiment(TRAINING_EXPERIMENT)
    timestamp = _utc_now().strftime("%Y%m%d%H%M%S")
    effective_run_name = run_name or f"{normalized}-{timestamp}"
    artifact_path = challenger_bundle_path(effective_run_name)

    if log_callback is not None:
        log_callback(f"Starting MLflow run {effective_run_name}")

    with mlflow.start_run(run_name=effective_run_name) as run:
        if log_callback is not None:
            log_callback(f"Training {normalized} through MLOPS/model_pipeline.py")
        training_result = train_model(
            dataset_name=normalized,
            hyperparameters=hyperparameters,
            artifact_path=artifact_path,
            mlflow_managed=True,
            log_callback=log_callback,
        )

        metrics = {
            "accuracy": float(training_result["accuracy"]),
            "f1": float(training_result["f1_macro"]),
            "precision": float(training_result["precision"]),
            "recall": float(training_result["recall"]),
            "auc": float(training_result["roc_auc"]),
        }

        mlflow.log_params(
            {
                "dataset": normalized,
                "n_estimators": int(hyperparameters.get("n_estimators", 300)),
                "learning_rate": float(hyperparameters.get("learning_rate", 0.05)),
                "num_leaves": int(hyperparameters.get("num_leaves", 63)),
            }
        )
        mlflow.log_metrics(metrics)
        if not artifact_path.exists():
            raise FileNotFoundError(
                f"Training completed but artifact was not created: {artifact_path}"
            )
        bundle = training_result.get("bundle")
        if bundle is None:
            raise ValueError("Training result did not include the saved model bundle")
        trained_model = bundle.get("model")
        if trained_model is None:
            raise ValueError("Training bundle is missing the trained model")

        # Log a standard MLflow sklearn model package so the UI shows MLmodel, conda.yaml,
        # model.pkl, python_env.yaml, and requirements.txt.
        mlflow.sklearn.log_model(trained_model, artifact_path="model")

        # Log the saved bundle into an explicit folder so it appears clearly
        # in MLflow's artifact browser.
        mlflow.log_artifact(str(artifact_path), artifact_path="model_bundle")
        mlflow.set_tags(
            {
                "triggered_by": triggered_by,
                "dataset": normalized,
                "role": role,
            }
        )
        artifact_uri = mlflow.get_artifact_uri("model")

    return {
        "run_id": run.info.run_id,
        "run_name": effective_run_name,
        "dataset": normalized,
        "status": "completed",
        "metrics": metrics,
        "artifact_path": str(artifact_path),
        "artifact_uri": artifact_uri,
        "mlflow_run_url": _mlflow_run_url(run.info.run_id),
    }


def get_mlflow_run(run_id: str) -> dict[str, Any]:
    mlflow.set_tracking_uri(MLFLOW_TRACKING_URI)
    client = MlflowClient()
    run = client.get_run(run_id)
    return {
        "run_id": run.info.run_id,
        "status": run.info.status,
        "artifact_uri": run.info.artifact_uri,
        "metrics": {key: float(value) for key, value in run.data.metrics.items()},
        "params": dict(run.data.params),
        "tags": dict(run.data.tags),
        "mlflow_run_url": _mlflow_run_url(run.info.run_id),
    }


def promote_run(run_id: str, dataset: str) -> dict[str, Any]:
    exports = _model_pipeline_exports()
    model_path_for = exports["model_path_for"]
    normalize_dataset_name = exports["normalize_dataset_name"]

    mlflow.set_tracking_uri(MLFLOW_TRACKING_URI)
    client = MlflowClient()
    run = client.get_run(run_id)
    artifact_uri = run.info.artifact_uri

    try:
        client.create_registered_model(CHAMPION_MODEL_NAME)
    except Exception:
        logger.debug("Registered model %s already exists", CHAMPION_MODEL_NAME)

    model_version = client.create_model_version(
        name=CHAMPION_MODEL_NAME,
        source=artifact_uri,
        run_id=run_id,
    )
    try:
        client.transition_model_version_stage(
            name=CHAMPION_MODEL_NAME,
            version=model_version.version,
            stage="Production",
        )
    except AttributeError:
        client.transition_model_version_stage(  # pragma: no cover
            name=CHAMPION_MODEL_NAME,
            version=model_version.version,
            stage="Production",
        )

    source_path = _resolve_local_artifact_path(run_id)
    champion_path = model_path_for(normalize_dataset_name(dataset))
    champion_path.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(source_path, champion_path)

    return {
        "run_id": run_id,
        "model_version": str(model_version.version),
        "stage": "Production",
        "artifact_path": str(champion_path),
        "registered_model": CHAMPION_MODEL_NAME,
    }


def _resolve_local_artifact_path(run_id: str) -> Path:
    direct = challenger_bundle_path(run_id)
    if direct.exists():
        return direct
    raise FileNotFoundError(f"Unable to resolve local artifact for MLflow run {run_id}")


def _mlflow_run_url(run_id: str) -> str:
    base = MLFLOW_TRACKING_URI.rstrip("/")
    if base.startswith("http://") or base.startswith("https://"):
        return f"{base}/#/experiments/search?searchFilter=run_id%20%3D%20%27{run_id}%27"
    return f"mlflow://{run_id}"
