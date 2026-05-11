from __future__ import annotations

from datetime import datetime, timedelta
from random import Random

from .schemas import AdminSettings

RNG = Random(42)


DEFAULT_SETTINGS = AdminSettings().model_dump()

MODEL_COMPARISON = {
    "TON_IoT": {
        "LightGBM": 0.9951,
        "XGBoost": 0.9812,
        "RandomForest": 0.9770,
        "MLP": 0.9561,
        "ExtraTree": 0.9685,
        "LogReg": 0.9012,
    },
    "eMBB": {
        "LightGBM": 0.8824,
        "XGBoost": 0.8712,
        "RandomForest": 0.8621,
        "MLP": 0.8440,
        "ExtraTree": 0.8506,
        "LogReg": 0.8012,
    },
    "mMTC": {
        "LightGBM": 0.8917,
        "XGBoost": 0.8801,
        "RandomForest": 0.8710,
        "MLP": 0.8575,
        "ExtraTree": 0.8627,
        "LogReg": 0.8120,
    },
    "URLLC": {
        "LightGBM": 0.9132,
        "XGBoost": 0.9066,
        "RandomForest": 0.8940,
        "MLP": 0.8750,
        "ExtraTree": 0.8831,
        "LogReg": 0.8307,
    },
}


def timeline_points():
    base = datetime(2026, 5, 1, 0, 0, 0)
    return [
        {
            "hour": (base + timedelta(hours=idx)).strftime("%H:%M"),
            "detections": 18 + ((idx * 7) % 23),
        }
        for idx in range(12)
    ]


def attack_distribution():
    return [
        {"label": "DDoS", "value": 34},
        {"label": "MITM", "value": 18},
        {"label": "Botnet", "value": 16},
        {"label": "Injection", "value": 14},
        {"label": "Phishing", "value": 10},
        {"label": "Scanning", "value": 8},
    ]


def recent_alerts():
    now = datetime.utcnow()
    return [
        {
            "id": "alert-1",
            "title": "High Traffic Surge",
            "severity": "HIGH",
            "message": "Traffic volume exceeded the analyst baseline for URLLC ingress.",
            "created_at": now - timedelta(minutes=9),
            "context": {"dataset": "URLLC", "delta": "+37%"},
        },
        {
            "id": "alert-2",
            "title": "Model Drift Warning",
            "severity": "MEDIUM",
            "message": (
                "Feature distribution drift is approaching the 0.15 "
                "recalibration threshold."
            ),
            "created_at": now - timedelta(minutes=24),
            "context": {"dataset": "mMTC", "drift": 0.142},
        },
        {
            "id": "alert-3",
            "title": "Low Severity Recon",
            "severity": "LOW",
            "message": "Background scanning remains within expected containment policy.",
            "created_at": now - timedelta(hours=1, minutes=8),
            "context": {"dataset": "TON_IoT"},
        },
    ]
