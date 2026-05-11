from __future__ import annotations

import json
from datetime import datetime
from urllib.parse import parse_qs

from fastapi import Depends, FastAPI, Header, HTTPException, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session

from app_web.backend.shared.config import (
    ALLOWED_ORIGINS,
    INTERNAL_SERVICE_TOKEN,
    TOKEN_COOKIE_NAME,
)
from app_web.backend.shared.db import Base, SessionLocal, get_db, init_db
from app_web.backend.shared.elk_client import emit_nowait
from app_web.backend.shared.models import User
from app_web.backend.shared.schemas import (
    AuthResponse,
    RegistrationResponse,
    RoleUpdate,
    UserCreate,
    UserOut,
)
from app_web.backend.shared.security import (
    create_access_token,
    get_current_user,
    hash_password,
    require_roles,
    seed_default_users,
    verify_password,
)

app = FastAPI(title="IOTinel Auth Service", version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def require_internal_token(x_internal_token: str = Header(default="")) -> None:
    if x_internal_token != INTERNAL_SERVICE_TOKEN:
        raise HTTPException(status_code=403, detail="Invalid internal service token")


@app.on_event("startup")
def startup() -> None:
    init_db(Base)
    with SessionLocal() as db:
        seed_default_users(db)


@app.get("/health")
def health():
    return {"status": "UP", "service": "auth_service", "port": 8001}


@app.post("/auth/login", response_model=AuthResponse)
async def login(request: Request, response: Response, db: Session = Depends(get_db)):
    body_bytes = await request.body()
    content_type = request.headers.get("content-type", "").lower()
    email = ""
    password = ""

    if "application/json" in content_type:
        try:
            payload = json.loads(body_bytes.decode("utf-8")) if body_bytes else {}
        except json.JSONDecodeError as exc:
            raise HTTPException(status_code=400, detail="Invalid JSON payload") from exc
        email = str(payload.get("email", "")).strip()
        password = str(payload.get("password", ""))
    else:
        parsed = parse_qs(body_bytes.decode("utf-8")) if body_bytes else {}
        email = (parsed.get("email", [""])[0] or "").strip()
        password = parsed.get("password", [""])[0] or ""

    if not email or not password:
        emit_nowait(
            "6g-ids-auth",
            {
                "service": "auth_service",
                "event_type": "auth",
                "level": "warning",
                "username": email,
                "role": None,
                "success": False,
                "ip_address": request.client.host if request.client else None,
                "timestamp": datetime.utcnow().isoformat(),
            },
        )
        raise HTTPException(status_code=400, detail="Email and password are required")
    if len(password) < 6:
        raise HTTPException(
            status_code=400, detail="Password must be at least 6 characters"
        )

    user = db.query(User).filter(User.email == email).first()
    if not user or not verify_password(password, user.password_hash):
        emit_nowait(
            "6g-ids-auth",
            {
                "service": "auth_service",
                "event_type": "auth",
                "level": "warning",
                "username": email,
                "role": getattr(user, "role", None),
                "success": False,
                "ip_address": request.client.host if request.client else None,
                "timestamp": datetime.utcnow().isoformat(),
            },
        )
        raise HTTPException(status_code=401, detail="Invalid credentials")
    if not user.is_active:
        raise HTTPException(status_code=403, detail="User account is inactive")
    if user.status == "pending":
        return JSONResponse(
            status_code=403,
            content={"error": "Your account is awaiting admin approval."},
        )
    if user.status == "rejected":
        return JSONResponse(
            status_code=403,
            content={
                "error": "Your account request was rejected. Contact your administrator."
            },
        )
    user.last_login = datetime.utcnow()
    db.commit()
    token = create_access_token(user)
    response.set_cookie(
        TOKEN_COOKIE_NAME, token, httponly=True, samesite="lax", secure=False
    )
    emit_nowait(
        "6g-ids-auth",
        {
            "service": "auth_service",
            "event_type": "auth",
            "level": "info",
            "username": user.email,
            "role": user.role,
            "success": True,
            "ip_address": request.client.host if request.client else None,
            "timestamp": datetime.utcnow().isoformat(),
        },
    )
    return {"access_token": token, "user": user}


@app.post("/auth/register", response_model=RegistrationResponse)
def register(payload: UserCreate, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == payload.email).first()
    if existing:
        raise HTTPException(status_code=409, detail="Email already exists")
    user = User(
        full_name=payload.full_name,
        email=payload.email,
        password_hash=hash_password(payload.password),
        role=payload.role,
        status="pending",
        is_active=True,
    )
    db.add(user)
    db.commit()
    return {"message": "Account pending admin approval", "status": "pending"}


@app.get("/auth/users", response_model=list[UserOut])
def list_users(
    db: Session = Depends(get_db),
    _: User = Depends(require_roles("administrator")),
):
    return db.query(User).order_by(User.created_at.desc()).all()


@app.get("/auth/internal/users")
def internal_list_users(
    db: Session = Depends(get_db),
    _: None = Depends(require_internal_token),
):
    users = db.query(User).order_by(User.created_at.desc()).all()
    return [
        {
            "id": user.id,
            "full_name": user.full_name,
            "email": user.email,
            "role": user.role,
            "status": user.status,
            "is_active": user.is_active,
            "last_login": user.last_login,
            "created_at": user.created_at,
        }
        for user in users
    ]


@app.get("/auth/internal/users/{user_id}")
def internal_get_user(
    user_id: int,
    db: Session = Depends(get_db),
    _: None = Depends(require_internal_token),
):
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return {
        "id": user.id,
        "full_name": user.full_name,
        "email": user.email,
        "role": user.role,
        "status": user.status,
        "is_active": user.is_active,
        "last_login": user.last_login,
        "created_at": user.created_at,
    }


@app.get("/auth/internal/pending-users")
def internal_pending_users(
    db: Session = Depends(get_db),
    _: None = Depends(require_internal_token),
):
    users = (
        db.query(User)
        .filter(User.status == "pending")
        .order_by(User.created_at.desc())
        .all()
    )
    return [
        {
            "id": user.id,
            "full_name": user.full_name,
            "email": user.email,
            "role": user.role,
            "created_at": user.created_at,
        }
        for user in users
    ]


@app.post("/auth/users", response_model=UserOut)
def create_user(
    payload: UserCreate,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles("administrator")),
):
    existing = db.query(User).filter(User.email == payload.email).first()
    if existing:
        raise HTTPException(status_code=409, detail="Email already exists")
    user = User(
        full_name=payload.full_name,
        email=payload.email,
        password_hash=hash_password(payload.password),
        role=payload.role,
        status="active",
        is_active=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@app.put("/auth/roles/{user_id}", response_model=UserOut)
def update_role(
    user_id: int,
    payload: RoleUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles("administrator")),
):
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.role = payload.role
    db.commit()
    db.refresh(user)
    return user


@app.delete("/auth/users/{user_id}")
def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles("administrator")),
):
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    db.delete(user)
    db.commit()
    return {"status": "deleted", "user_id": user_id}


@app.put("/auth/internal/users/{user_id}/activate")
def internal_activate_user(
    user_id: int,
    db: Session = Depends(get_db),
    _: None = Depends(require_internal_token),
):
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.is_active = not user.is_active
    db.commit()
    db.refresh(user)
    return {
        "id": user.id,
        "full_name": user.full_name,
        "email": user.email,
        "role": user.role,
        "status": user.status,
        "is_active": user.is_active,
        "last_login": user.last_login,
        "created_at": user.created_at,
    }


@app.put("/auth/internal/users/{user_id}/role")
def internal_update_role(
    user_id: int,
    payload: RoleUpdate,
    db: Session = Depends(get_db),
    _: None = Depends(require_internal_token),
):
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.role = payload.role
    db.commit()
    db.refresh(user)
    return UserOut.model_validate(user).model_dump()


@app.delete("/auth/internal/users/{user_id}")
def internal_delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    _: None = Depends(require_internal_token),
):
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    db.delete(user)
    db.commit()
    return {"status": "deleted", "user_id": user_id}


@app.put("/auth/internal/requests/{user_id}/approve")
def internal_approve_user(
    user_id: int,
    db: Session = Depends(get_db),
    _: None = Depends(require_internal_token),
):
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.status = "active"
    db.commit()
    db.refresh(user)
    return {
        "message": "User approved",
        "user": UserOut.model_validate(user).model_dump(),
    }


@app.put("/auth/internal/requests/{user_id}/reject")
def internal_reject_user(
    user_id: int,
    db: Session = Depends(get_db),
    _: None = Depends(require_internal_token),
):
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.status = "rejected"
    db.commit()
    db.refresh(user)
    return {
        "message": "User rejected",
        "user": UserOut.model_validate(user).model_dump(),
    }


@app.get("/auth/me", response_model=UserOut)
def me(user: User = Depends(get_current_user)):
    return user
