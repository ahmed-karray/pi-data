from __future__ import annotations

from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import DeclarativeBase, sessionmaker

from .config import DATABASE_URL


class Base(DeclarativeBase):
    pass


connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}
engine = create_engine(DATABASE_URL, future=True, connect_args=connect_args)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False, future=True)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db(base) -> None:
    base.metadata.create_all(bind=engine)
    _ensure_user_status_column()


def _ensure_user_status_column() -> None:
    inspector = inspect(engine)
    if "users" not in inspector.get_table_names():
        return
    user_columns = {column["name"] for column in inspector.get_columns("users")}
    if "status" in user_columns:
        return
    with engine.begin() as connection:
        connection.execute(
            text("ALTER TABLE users ADD COLUMN status VARCHAR(32) DEFAULT 'pending'")
        )
        connection.execute(
            text("UPDATE users SET status = 'active' WHERE status IS NULL")
        )
