"""
ELK Logger — 6G Smart City IDS
Sends prediction events, model metrics, system metrics and drift alerts
to Elasticsearch for real-time visualisation in Kibana.

Indices:
  ids-predictions  — every prediction (confidence, attack type, severity …)
  ids-metrics      — model performance after training (accuracy, F1, ROC-AUC)
  ids-system       — system resource usage (CPU, RAM, disk, API uptime)
  ids-drift        — concept drift alerts and retraining recommendations
"""

import os
import platform
import threading
from datetime import datetime, timezone
from typing import Any, Dict, Optional

# ── psutil (optional — system metrics) ────────────────────────────────────────
try:
    import psutil

    PSUTIL_AVAILABLE = True
except ImportError:
    PSUTIL_AVAILABLE = False
    print("ℹ️  psutil not installed — system metrics disabled. (pip install psutil)")

# ── Elasticsearch client ───────────────────────────────────────────────────────
try:
    from elasticsearch import Elasticsearch

    ES_AVAILABLE = True
except ImportError:
    ES_AVAILABLE = False
    print("ℹ️  elasticsearch package not installed — ELK logging disabled.")

# ── Configuration ─────────────────────────────────────────────────────────────
ES_HOST = os.getenv("ES_HOST", "http://localhost:9200")
ES_TIMEOUT = int(os.getenv("ES_TIMEOUT", "5"))

INDEX_PREDICTIONS = "ids-predictions"
INDEX_METRICS = "ids-metrics"
INDEX_SYSTEM = "ids-system"
INDEX_DRIFT = "ids-drift"

# Index mappings
_PRED_MAPPING = {
    "mappings": {
        "properties": {
            "@timestamp": {"type": "date"},
            "dataset": {"type": "keyword"},
            "prediction": {"type": "keyword"},
            "attack_type": {"type": "keyword"},
            "severity": {"type": "keyword"},
            "alert_status": {"type": "keyword"},
            "confidence": {"type": "float"},
            "response_time_ms": {"type": "float"},
            "is_malicious": {"type": "boolean"},
            "host": {"type": "keyword"},
        }
    }
}

_METRICS_MAPPING = {
    "mappings": {
        "properties": {
            "@timestamp": {"type": "date"},
            "dataset": {"type": "keyword"},
            "event_type": {"type": "keyword"},
            "accuracy": {"type": "float"},
            "f1_macro": {"type": "float"},
            "roc_auc": {"type": "float"},
            "host": {"type": "keyword"},
        }
    }
}

_SYSTEM_MAPPING = {
    "mappings": {
        "properties": {
            "@timestamp": {"type": "date"},
            "cpu_percent": {"type": "float"},
            "memory_percent": {"type": "float"},
            "memory_used_mb": {"type": "float"},
            "memory_total_mb": {"type": "float"},
            "disk_percent": {"type": "float"},
            "disk_used_gb": {"type": "float"},
            "api_uptime_seconds": {"type": "float"},
            "host": {"type": "keyword"},
        }
    }
}

_DRIFT_MAPPING = {
    "mappings": {
        "properties": {
            "@timestamp": {"type": "date"},
            "dataset": {"type": "keyword"},
            "drift_detected": {"type": "boolean"},
            "drift_type": {"type": "keyword"},
            "recommendation": {"type": "text"},
            "should_retrain": {"type": "boolean"},
            "host": {"type": "keyword"},
        }
    }
}


class ELKLogger:
    """Thread-safe Elasticsearch logger for 6G IDS telemetry."""

    def __init__(self, host: str = ES_HOST):
        self.host = host
        self.client: Optional[Any] = None
        self.enabled = False
        self._hostname = platform.node()
        self._start_time = datetime.now(timezone.utc)
        self._stop_event = threading.Event()
        self._system_thread: Optional[threading.Thread] = None
        self._connect()

    # ── Connection ────────────────────────────────────────────────────────────

    def _connect(self):
        """Try to connect to Elasticsearch; disable gracefully on failure."""
        if not ES_AVAILABLE:
            return
        try:
            self.client = Elasticsearch(self.host, request_timeout=ES_TIMEOUT)
            info = self.client.info()
            version = info["version"]["number"]
            self.enabled = True
            print(f"✅ ELK Logger → Elasticsearch {version} @ {self.host}")
            self._ensure_indices()
        except Exception as exc:
            print(
                f"⚠️  ELK Logger: ES unreachable "
                f"({exc.__class__.__name__}: {exc}). Logging disabled."
            )

    def _ensure_indices(self):
        """Create index mappings once if they do not yet exist."""
        for name, mapping in [
            (INDEX_PREDICTIONS, _PRED_MAPPING),
            (INDEX_METRICS, _METRICS_MAPPING),
            (INDEX_SYSTEM, _SYSTEM_MAPPING),
            (INDEX_DRIFT, _DRIFT_MAPPING),
        ]:
            try:
                if not self.client.indices.exists(index=name):
                    self.client.indices.create(index=name, body=mapping)
                    print(f"  📂 Created index: {name}")
            except Exception as exc:
                print(f"  ⚠️  Could not create index {name}: {exc}")
        print("✅ ELK indices ready")

    # ── Public logging methods (all silently no-op on failure) ────────────────

    def log_prediction(
        self,
        dataset: str,
        prediction: str,
        attack_type: str,
        severity: str,
        confidence: float,
        alert_status: str,
        response_time_ms: float,
    ) -> None:
        """Index one prediction event into Elasticsearch."""
        if not self.enabled:
            return
        try:
            self.client.index(
                index=INDEX_PREDICTIONS,
                body={
                    "@timestamp": datetime.now(timezone.utc).isoformat(),
                    "dataset": dataset,
                    "prediction": prediction,
                    "attack_type": attack_type,
                    "severity": severity,
                    "alert_status": alert_status,
                    "confidence": round(confidence, 4),
                    "response_time_ms": round(response_time_ms, 2),
                    "is_malicious": prediction == "Malicious",
                    "host": self._hostname,
                },
            )
        except Exception:
            pass  # Never crash the main API

    def log_model_metrics(
        self,
        dataset: str,
        accuracy: float,
        f1_macro: float,
        roc_auc: float,
        event_type: str = "training",
    ) -> None:
        """Index model performance metrics (called after training)."""
        if not self.enabled:
            return
        try:
            self.client.index(
                index=INDEX_METRICS,
                body={
                    "@timestamp": datetime.now(timezone.utc).isoformat(),
                    "dataset": dataset,
                    "event_type": event_type,
                    "accuracy": round(accuracy, 4),
                    "f1_macro": round(f1_macro, 4),
                    "roc_auc": round(roc_auc, 4),
                    "host": self._hostname,
                },
            )
        except Exception:
            pass

    def log_system_metrics(self) -> None:
        """Index current CPU / RAM / disk usage + API uptime."""
        if not self.enabled or not PSUTIL_AVAILABLE:
            return
        try:
            mem = psutil.virtual_memory()
            disk = psutil.disk_usage("/")
            uptime = (datetime.now(timezone.utc) - self._start_time).total_seconds()
            self.client.index(
                index=INDEX_SYSTEM,
                body={
                    "@timestamp": datetime.now(timezone.utc).isoformat(),
                    "cpu_percent": psutil.cpu_percent(interval=None),
                    "memory_percent": mem.percent,
                    "memory_used_mb": round(mem.used / 1_048_576, 1),
                    "memory_total_mb": round(mem.total / 1_048_576, 1),
                    "disk_percent": disk.percent,
                    "disk_used_gb": round(disk.used / 1_073_741_824, 2),
                    "api_uptime_seconds": round(uptime, 1),
                    "host": self._hostname,
                },
            )
        except Exception:
            pass

    def log_drift_alert(
        self,
        dataset: str,
        drift_detected: bool,
        drift_type: str,
        recommendation: str,
        should_retrain: bool,
    ) -> None:
        """Index a concept drift alert."""
        if not self.enabled:
            return
        try:
            self.client.index(
                index=INDEX_DRIFT,
                body={
                    "@timestamp": datetime.now(timezone.utc).isoformat(),
                    "dataset": dataset,
                    "drift_detected": drift_detected,
                    "drift_type": drift_type,
                    "recommendation": recommendation,
                    "should_retrain": should_retrain,
                    "host": self._hostname,
                },
            )
        except Exception:
            pass

    # ── Background system metrics scheduler ───────────────────────────────────

    def start_system_metrics_scheduler(self, interval_seconds: int = 30) -> None:
        """Spawn a daemon thread that logs system metrics periodically."""
        if not self.enabled:
            return
        if not PSUTIL_AVAILABLE:
            print("ℹ️  System metrics scheduler skipped (install psutil).")
            return

        def _loop():
            # Send an immediate snapshot on start
            self.log_system_metrics()
            while not self._stop_event.wait(interval_seconds):
                self.log_system_metrics()

        self._system_thread = threading.Thread(
            target=_loop, daemon=True, name="elk-sys-metrics"
        )
        self._system_thread.start()
        print(f"📊 System metrics → Elasticsearch every {interval_seconds}s")

    def stop(self) -> None:
        """Signal the background thread to stop."""
        self._stop_event.set()

    # ── Status ────────────────────────────────────────────────────────────────

    def ping(self) -> bool:
        if not self.enabled:
            return False
        try:
            return bool(self.client.ping())
        except Exception:
            return False

    def index_counts(self) -> Dict[str, int]:
        """Return document count per index."""
        counts = {}
        if not self.enabled:
            return counts
        for idx in [INDEX_PREDICTIONS, INDEX_METRICS, INDEX_SYSTEM, INDEX_DRIFT]:
            try:
                r = self.client.count(index=idx)
                counts[idx] = r["count"]
            except Exception:
                counts[idx] = -1
        return counts

    def status(self) -> Dict[str, Any]:
        return {
            "enabled": self.enabled,
            "host": self.host,
            "reachable": self.ping(),
            "doc_counts": self.index_counts(),
            "indices": [INDEX_PREDICTIONS, INDEX_METRICS, INDEX_SYSTEM, INDEX_DRIFT],
            "psutil_available": PSUTIL_AVAILABLE,
        }


# ── Singleton ─────────────────────────────────────────────────────────────────
_elk_logger: Optional[ELKLogger] = None


def get_elk_logger() -> ELKLogger:
    """Return (or create) the singleton ELKLogger."""
    global _elk_logger
    if _elk_logger is None:
        _elk_logger = ELKLogger()
    return _elk_logger
