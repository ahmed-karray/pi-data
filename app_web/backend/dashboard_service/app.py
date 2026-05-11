from __future__ import annotations

from fastapi import Depends, FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from app_web.backend.shared.config import ALLOWED_ORIGINS
from app_web.backend.shared.db import Base, SessionLocal, get_db, init_db
from app_web.backend.shared.mlops_bridge import (
    attack_stats,
    metrics_over_time,
    recent_stats,
    summary_stats,
)
from app_web.backend.shared.models import User
from app_web.backend.shared.security import require_roles, seed_default_users
from app_web.backend.shared.store import MODEL_COMPARISON, recent_alerts

app = FastAPI(title="IOTinel Dashboard Service", version="1.0.0")
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
    return {"status": "UP", "service": "dashboard_service", "port": 8005}


@app.get("/dashboard/overview")
async def overview(
    db: Session = Depends(get_db),
    user: User = Depends(
        require_roles("security_analyst", "data_scientist", "administrator")
    ),
):
    summary = await summary_stats()
    payload = {
        "summary": summary,
        "recent": await recent_stats(),
    }
    if user.role == "administrator":
        payload["admin_context"] = {"user_count": db.query(User).count()}
    return payload


@app.get("/dashboard/summary")
async def dashboard_summary(
    _: User = Depends(
        require_roles("security_analyst", "data_scientist", "administrator")
    )
):
    return await summary_stats()


@app.get("/dashboard/attacks")
async def attacks(
    _: User = Depends(
        require_roles("security_analyst", "data_scientist", "administrator")
    )
):
    return await attack_stats()


@app.get("/dashboard/timeline")
async def timeline(
    _: User = Depends(
        require_roles("security_analyst", "data_scientist", "administrator")
    )
):
    return await metrics_over_time()


@app.get("/dashboard/recent")
async def dashboard_recent(
    _: User = Depends(
        require_roles("security_analyst", "data_scientist", "administrator")
    )
):
    return await recent_stats()


@app.get("/dashboard/model-comparison")
def model_comparison(
    _: User = Depends(
        require_roles("security_analyst", "data_scientist", "administrator")
    )
):
    return MODEL_COMPARISON


@app.get("/dashboard/alerts")
def alerts(
    _: User = Depends(
        require_roles("security_analyst", "data_scientist", "administrator")
    )
):
    return {"alerts": recent_alerts()}


@app.websocket("/dashboard/timeline/ws")
async def timeline_ws(websocket: WebSocket):
    await websocket.accept()
    try:
        await websocket.send_json(await metrics_over_time())
    except WebSocketDisconnect:
        return
    finally:
        await websocket.close()
