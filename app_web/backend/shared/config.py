from __future__ import annotations

import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parents[1]
APP_WEB_DIR = BASE_DIR.parent
PROJECT_ROOT = APP_WEB_DIR.parent


def _first_existing(*paths: Path) -> Path:
    for path in paths:
        if path.exists():
            return path
    return paths[0]


MLOPS_DIR = _first_existing(PROJECT_ROOT / "mlops", PROJECT_ROOT / "MLOPS")
DATA_DIR = _first_existing(
    MLOPS_DIR / "data",
    APP_WEB_DIR / "public" / "data",
    PROJECT_ROOT / "Data5G",
)
MLRUNS_DIR = _first_existing(MLOPS_DIR / "mlruns", PROJECT_ROOT / "mlruns")
DEFAULT_DB_PATH = BASE_DIR / "iotinel.db"

JWT_SECRET = os.getenv("JWT_SECRET", "hexamind-dev-secret")
JWT_ALGORITHM = "HS256"
TOKEN_COOKIE_NAME = "iotinel_access_token"
DATABASE_URL = os.getenv("DATABASE_URL", f"sqlite:///{DEFAULT_DB_PATH.as_posix()}")
MLFLOW_TRACKING_URI = os.getenv("MLFLOW_TRACKING_URI", MLRUNS_DIR.as_posix())
REDIS_URL = os.getenv("REDIS_URL", "redis://redis:6379/0")
INTERNAL_SERVICE_TOKEN = os.getenv("INTERNAL_SERVICE_TOKEN", "hexamind-internal-token")
MLOPS_API_BASE = os.getenv("MLOPS_API_BASE", "http://mlops-api:8000")
MLOPS_API_LOCAL = os.getenv("MLOPS_API_LOCAL", "http://localhost:8088")
ELASTICSEARCH_URL = os.getenv(
    "ELASTICSEARCH_URL",
    os.getenv("ES_HOST", "http://mlops-elasticsearch:9200"),
)
ELASTICSEARCH_TIMEOUT = float(os.getenv("ELASTICSEARCH_TIMEOUT", "5"))

SERVICE_PORTS = {
    "gateway": 8000,
    "auth": 8001,
    "detection": 8002,
    "training": 8003,
    "monitoring": 8004,
    "dashboard": 8005,
    "admin": 8006,
}

SERVICE_URLS = {
    "auth": os.getenv("AUTH_SERVICE_URL", "http://auth_service:8001"),
    "detection": os.getenv("DETECTION_SERVICE_URL", "http://detection_service:8002"),
    "training": os.getenv("TRAINING_SERVICE_URL", "http://ml_training_service:8003"),
    "monitoring": os.getenv("MONITORING_SERVICE_URL", "http://monitoring_service:8004"),
    "dashboard": os.getenv("DASHBOARD_SERVICE_URL", "http://dashboard_service:8005"),
    "admin": os.getenv("ADMIN_SERVICE_URL", "http://admin_service:8006"),
    "analyst_ui": os.getenv("ANALYST_UI_URL", "http://analyst-ui:80"),
    "scientist_ui": os.getenv("SCIENTIST_UI_URL", "http://scientist-ui:80"),
    "admin_ui": os.getenv("ADMIN_UI_URL", "http://admin-ui:80"),
}

ALLOWED_ORIGINS = [
    "http://localhost:8010",
    "http://127.0.0.1:8010",
    "http://localhost:3001",
    "http://localhost:3002",
    "http://localhost:3003",
    "http://127.0.0.1:3001",
    "http://127.0.0.1:3002",
    "http://127.0.0.1:3003",
]
