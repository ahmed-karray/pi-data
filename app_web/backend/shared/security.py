from __future__ import annotations

from datetime import datetime, timedelta, timezone
import logging
import traceback

import httpx
from fastapi import Depends, HTTPException, Request, status
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy.orm import Session

from .config import (
    INTERNAL_SERVICE_TOKEN,
    JWT_ALGORITHM,
    JWT_SECRET,
    SERVICE_URLS,
    TOKEN_COOKIE_NAME,
)
from .db import get_db
from .models import User
from .schemas import RoleName

pwd_context = CryptContext(schemes=["pbkdf2_sha256"], deprecated="auto")
logger = logging.getLogger(__name__)


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(password: str, password_hash: str) -> bool:
    return pwd_context.verify(password, password_hash)


def create_access_token(user: User, expires_minutes: int = 60 * 12) -> str:
    expire = datetime.now(timezone.utc) + timedelta(minutes=expires_minutes)
    payload = {
        "sub": str(user.id),
        "email": user.email,
        "role": user.role,
        "exp": expire,
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def decode_token(token: str) -> dict:
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except JWTError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token"
        ) from exc


def _extract_token(request: Request) -> str:
    auth_header = request.headers.get("Authorization", "")
    if auth_header.lower().startswith("bearer "):
        return auth_header.split(" ", 1)[1]
    cookie_token = request.cookies.get(TOKEN_COOKIE_NAME)
    if cookie_token:
        return cookie_token
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication required"
    )


def _parse_datetime(value):
    if isinstance(value, datetime) or value is None:
        return value
    if isinstance(value, str) and value:
        normalized = value.replace("Z", "+00:00")
        try:
            return datetime.fromisoformat(normalized)
        except ValueError:
            return None
    return None


def _sync_user_from_auth(db: Session, payload: dict) -> User | None:
    user_id = payload.get("sub")
    if not user_id:
        return None
    try:
        response = httpx.get(
            f"{SERVICE_URLS['auth']}/auth/internal/users/{user_id}",
            headers={"X-Internal-Token": INTERNAL_SERVICE_TOKEN},
            timeout=10.0,
        )
        if response.status_code == 404:
            return None
        response.raise_for_status()
        remote = response.json()
    except Exception:
        logger.error(
            "Failed to synchronize user %s from auth service\n%s",
            user_id,
            traceback.format_exc(),
        )
        return None

    user = db.get(User, int(remote["id"]))
    if user is None:
        user = User(
            id=int(remote["id"]),
            full_name=remote["full_name"],
            email=remote["email"],
            password_hash="synced-from-auth",
            role=remote["role"],
            status=remote.get("status", "active"),
            is_active=bool(remote.get("is_active", True)),
            last_login=_parse_datetime(remote.get("last_login")),
        )
        db.add(user)
    else:
        user.full_name = remote["full_name"]
        user.email = remote["email"]
        user.role = remote["role"]
        user.status = remote.get("status", user.status)
        user.is_active = bool(remote.get("is_active", user.is_active))
        user.last_login = _parse_datetime(remote.get("last_login"))
    db.commit()
    db.refresh(user)
    return user


def get_current_user(request: Request, db: Session = Depends(get_db)) -> User:
    token = _extract_token(request)
    payload = decode_token(token)
    user = db.get(User, int(payload["sub"]))
    if not user and payload.get("email"):
        user = db.query(User).filter(User.email == payload["email"]).first()
    if (
        not user
        or user.email != payload.get("email")
        or user.role != payload.get("role")
        or not user.is_active
        or user.status != "active"
    ):
        user = _sync_user_from_auth(db, payload) or user
    if not user or not user.is_active or user.status != "active":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="User not available"
        )
    return user


def require_roles(*roles: RoleName):
    role_set = set(roles)

    def dependency(user: User = Depends(get_current_user)) -> User:
        if user.role not in role_set:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permissions"
            )
        return user

    return dependency


def seed_default_users(db: Session) -> None:
    defaults = [
        (
            "Security Analyst",
            "analyst@hexamind.local",
            "analyst123",
            "security_analyst",
        ),
        (
            "Data Scientist",
            "scientist@hexamind.local",
            "scientist123",
            "data_scientist",
        ),
        ("Administrator", "admin@hexamind.local", "admin123", "administrator"),
    ]
    for full_name, email, password, role in defaults:
        existing = db.query(User).filter(User.email == email).first()
        if existing:
            continue
        db.add(
            User(
                full_name=full_name,
                email=email,
                password_hash=hash_password(password),
                role=role,
                status="active",
                is_active=True,
            )
        )
    db.commit()
