from __future__ import annotations

from hashlib import sha256
import json
import os
from pathlib import Path
from typing import Any

from elasticsearch import Elasticsearch
import pandas as pd

BASE_DIR = Path(__file__).resolve().parent
SCHEMA_HASH_FILE = BASE_DIR / ".schema_hashes.json"
ES_URL = os.getenv("ES_URL", os.getenv("ES_HOST", "http://localhost:9200"))
SYSTEM_INDEX = "6g-ids-system"


def validate_dataset(dataset: str, frame: pd.DataFrame) -> dict[str, Any]:
    missing_ratio = float(frame.isna().mean().max()) if not frame.empty else 0.0
    label_col = "Label" if "Label" in frame.columns else None
    imbalance_ratio = 1.0
    if label_col is not None:
        counts = frame[label_col].value_counts()
        if not counts.empty and counts.min() > 0:
            imbalance_ratio = float(counts.max() / counts.min())

    schema_hash = sha256("|".join(map(str, frame.columns)).encode("utf-8")).hexdigest()
    known_hashes = _load_schema_hashes()
    previous_hash = known_hashes.get(dataset)
    schema_drift = previous_hash is not None and previous_hash != schema_hash

    critical_failures = []
    warnings = []
    if missing_ratio > 0.05:
        critical_failures.append(f"Missing values exceed 5% ({missing_ratio:.2%})")
    if imbalance_ratio > 10:
        warnings.append(f"Class imbalance is above 10:1 ({imbalance_ratio:.2f}:1)")
    if schema_drift:
        critical_failures.append("Schema drift detected against last known schema hash")

    report = {
        "dataset": dataset,
        "missing_ratio": missing_ratio,
        "class_imbalance_ratio": imbalance_ratio,
        "schema_hash": schema_hash,
        "previous_schema_hash": previous_hash,
        "schema_drift": schema_drift,
        "critical_failures": critical_failures,
        "warnings": warnings,
        "passed": not critical_failures,
    }
    _save_schema_hash(dataset, schema_hash)
    _emit_report(report)
    if critical_failures:
        raise ValueError("; ".join(critical_failures))
    return report


def _load_schema_hashes() -> dict[str, str]:
    if not SCHEMA_HASH_FILE.exists():
        return {}
    return json.loads(SCHEMA_HASH_FILE.read_text(encoding="utf-8"))


def _save_schema_hash(dataset: str, schema_hash: str) -> None:
    payload = _load_schema_hashes()
    payload[dataset] = schema_hash
    SCHEMA_HASH_FILE.write_text(json.dumps(payload, indent=2), encoding="utf-8")


def _emit_report(report: dict[str, Any]) -> None:
    try:
        client = Elasticsearch(ES_URL, request_timeout=5)
        client.index(
            index=SYSTEM_INDEX,
            document={
                "@timestamp": pd.Timestamp.utcnow().isoformat(),
                "service": "data_validator",
                "event_type": "health",
                "level": "warning" if not report["passed"] else "info",
                "validation_report": report,
            },
        )
    except Exception:
        pass
