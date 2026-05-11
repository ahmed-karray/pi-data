from __future__ import annotations

from pathlib import Path
import sys
import types

import mlflow
from mlflow.tracking import MlflowClient
from sklearn.dummy import DummyClassifier

from app_web.backend.shared import mlops_bridge


def test_run_training_creates_mlflow_run(monkeypatch, tmp_path):
    tracking_dir = tmp_path / "mlruns"
    artifact_path = tmp_path / "artifact.joblib"
    tracking_uri = tracking_dir.resolve().as_uri()

    monkeypatch.setattr(mlops_bridge, "MLFLOW_TRACKING_URI", tracking_uri)

    def fake_load_dataset(dataset):
        return dataset, None

    def fake_train_model(**kwargs):
        Path(kwargs["artifact_path"]).write_text("model", encoding="utf-8")
        model = DummyClassifier(strategy="most_frequent")
        model.fit([[0], [1]], [0, 1])
        return {
            "accuracy": 0.91,
            "f1_macro": 0.9,
            "precision": 0.89,
            "recall": 0.88,
            "roc_auc": 0.92,
            "artifact_path": str(artifact_path),
            "bundle": {"model": model},
        }

    fake_validator_module = types.SimpleNamespace(
        validate_dataset=lambda dataset, frame: {"dataset": dataset, "passed": True}
    )
    monkeypatch.setitem(sys.modules, "data_validator", fake_validator_module)
    monkeypatch.setattr(mlops_bridge, "_ensure_mlops_import_path", lambda: None)
    monkeypatch.setattr(
        mlops_bridge,
        "_model_pipeline_exports",
        lambda: {
            "load_dataset": fake_load_dataset,
            "train_model": fake_train_model,
            "normalize_dataset_name": lambda dataset: dataset,
            "model_path_for": lambda dataset: artifact_path,
            "DATASET_FILES": {},
            "FEATURE_MAP": {},
        },
    )
    monkeypatch.setattr(
        mlops_bridge, "challenger_bundle_path", lambda run_id: artifact_path
    )

    result = mlops_bridge.run_training(
        "eMBB", {"n_estimators": 50}, role="administrator"
    )

    mlflow.set_tracking_uri(tracking_uri)
    runs = mlflow.search_runs(experiment_names=[mlops_bridge.TRAINING_EXPERIMENT])
    client = MlflowClient(tracking_uri=tracking_uri)

    assert result["run_id"]
    assert result["status"] == "completed"
    assert not runs.empty
    root_artifacts = client.list_artifacts(result["run_id"])
    assert any(item.path == "model" and item.is_dir for item in root_artifacts)
    artifacts = client.list_artifacts(result["run_id"], path="model_bundle")
    assert any(item.path.endswith("artifact.joblib") for item in artifacts)
    model_artifacts = client.list_artifacts(result["run_id"], path="model")
    model_artifact_names = {Path(item.path).name for item in model_artifacts}
    assert {
        "MLmodel",
        "conda.yaml",
        "model.pkl",
        "python_env.yaml",
        "requirements.txt",
    } <= model_artifact_names
