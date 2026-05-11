from __future__ import annotations

import httpx
from time import perf_counter
from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from app_web.backend.shared.config import (
    ALLOWED_ORIGINS,
    INTERNAL_SERVICE_TOKEN,
    SERVICE_PORTS,
    SERVICE_URLS,
)
from app_web.backend.shared.db import Base, SessionLocal, get_db, init_db
from app_web.backend.shared.models import Setting, User
from app_web.backend.shared.schemas import AccessRequestOut, AdminSettings
from app_web.backend.shared.security import require_roles, seed_default_users

PERMISSIONS = {
    "administrator": ["Read", "Write", "Delete", "Manage Users"],
    "security_analyst": ["Read", "Write", "Analyze"],
    "data_scientist": ["Read", "Write", "Train Models"],
}

app = FastAPI(title="IOTinel Admin Service", version="1.0.0")
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


def _get_settings(db: Session) -> Setting:
    record = db.query(Setting).filter(Setting.key == "platform_settings").first()
    if record:
        return record
    record = Setting(key="platform_settings", value=AdminSettings().model_dump())
    db.add(record)
    db.commit()
    db.refresh(record)
    return record


async def _auth_service_request(
    method: str, path: str, json: dict | None = None
) -> dict | list:
    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.request(
            method,
            f"{SERVICE_URLS['auth']}{path}",
            headers={"X-Internal-Token": INTERNAL_SERVICE_TOKEN},
            json=json,
        )
    if response.status_code >= 400:
        detail = response.json().get("detail", "Auth service request failed")
        raise HTTPException(status_code=response.status_code, detail=detail)
    return response.json()


async def _service_health(service_name: str) -> dict[str, object]:
    url = f"{SERVICE_URLS[service_name]}/health"
    async with httpx.AsyncClient(timeout=10.0) as client:
        started = perf_counter()
        response = await client.get(url)
    latency_ms = round((perf_counter() - started) * 1000, 2)
    payload = (
        response.json()
        if response.headers.get("content-type", "").startswith("application/json")
        else {}
    )
    return {
        "service": service_name,
        "status": "UP" if response.status_code < 400 else "DOWN",
        "latency": latency_ms,
        "last_checked": payload.get("timestamp"),
        "detail": payload,
    }


@app.get("/health")
def health():
    return {"status": "UP", "service": "admin_service", "port": 8006}


@app.get("/admin/users")
async def admin_users(_: User = Depends(require_roles("administrator"))):
    return await _auth_service_request("GET", "/auth/internal/users")


@app.put("/admin/users/{user_id}/activate")
async def activate_user(
    user_id: int,
    _: User = Depends(require_roles("administrator")),
):
    return await _auth_service_request(
        "PUT", f"/auth/internal/users/{user_id}/activate"
    )


@app.put("/admin/users/{user_id}/role")
async def admin_update_role(
    user_id: int,
    payload: dict,
    _: User = Depends(require_roles("administrator")),
):
    return await _auth_service_request(
        "PUT", f"/auth/internal/users/{user_id}/role", json=payload
    )


@app.delete("/admin/users/{user_id}")
async def admin_delete_user(
    user_id: int,
    _: User = Depends(require_roles("administrator")),
):
    return await _auth_service_request("DELETE", f"/auth/internal/users/{user_id}")


@app.get("/admin/requests", response_model=list[AccessRequestOut])
async def access_requests(
    _: User = Depends(require_roles("administrator")),
):
    return await _auth_service_request("GET", "/auth/internal/pending-users")


@app.put("/admin/requests/{user_id}/approve")
async def approve_request(
    user_id: int,
    _: User = Depends(require_roles("administrator")),
):
    return await _auth_service_request(
        "PUT", f"/auth/internal/requests/{user_id}/approve"
    )


@app.put("/admin/requests/{user_id}/reject")
async def reject_request(
    user_id: int,
    _: User = Depends(require_roles("administrator")),
):
    return await _auth_service_request(
        "PUT", f"/auth/internal/requests/{user_id}/reject"
    )


@app.get("/admin/settings")
def get_settings(
    db: Session = Depends(get_db),
    _: User = Depends(require_roles("administrator")),
):
    return _get_settings(db).value


@app.put("/admin/settings")
def put_settings(
    payload: AdminSettings,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles("administrator")),
):
    record = _get_settings(db)
    record.value = payload.model_dump()
    db.commit()
    return record.value


@app.get("/admin/platform")
def platform(_: User = Depends(require_roles("administrator"))):
    return {
        "services": [
            {
                "service": "gateway",
                "port": SERVICE_PORTS["gateway"],
                "status": "UP",
                "uptime_percent": 99.98,
                "detail": "Healthy",
            },
            {
                "service": "auth_service",
                "port": 8001,
                "status": "UP",
                "uptime_percent": 99.95,
                "detail": "Healthy",
            },
            {
                "service": "detection_service",
                "port": 8002,
                "status": "UP",
                "uptime_percent": 99.99,
                "detail": "Healthy",
            },
            {
                "service": "ml_training_service",
                "port": 8003,
                "status": "UP",
                "uptime_percent": 99.90,
                "detail": "Warm standby",
            },
            {
                "service": "monitoring_service",
                "port": 8004,
                "status": "UP",
                "uptime_percent": 99.94,
                "detail": "Healthy",
            },
            {
                "service": "dashboard_service",
                "port": 8005,
                "status": "UP",
                "uptime_percent": 99.97,
                "detail": "Healthy",
            },
            {
                "service": "admin_service",
                "port": 8006,
                "status": "UP",
                "uptime_percent": 99.96,
                "detail": "Healthy",
            },
        ],
        "containers": [
            {"name": "gateway", "status": "running"},
            {"name": "auth_service", "status": "running"},
            {"name": "detection_service", "status": "running"},
            {"name": "ml_training_service", "status": "running"},
            {"name": "monitoring_service", "status": "running"},
            {"name": "dashboard_service", "status": "running"},
            {"name": "admin_service", "status": "running"},
        ],
    }


@app.get("/admin/health")
async def admin_health(_: User = Depends(require_roles("administrator"))):
    services = ["auth", "detection", "training", "monitoring", "dashboard", "admin"]
    results = []
    for service in services:
        try:
            results.append(await _service_health(service))
        except Exception as exc:
            results.append(
                {
                    "service": service,
                    "status": "DOWN",
                    "latency": None,
                    "last_checked": None,
                    "detail": {"error": str(exc)},
                }
            )
    return {"services": results}


@app.get("/admin/permissions")
def permissions(_: User = Depends(require_roles("administrator"))):
    return PERMISSIONS
