from __future__ import annotations

from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, Field

RoleName = Literal["security_analyst", "data_scientist", "administrator"]
DatasetName = Literal["eMBB", "mMTC", "URLLC", "TON_IoT", "train_test_network"]
ConfidenceGate = Literal["HIGH", "MEDIUM", "LOW"]
UserStatus = Literal["pending", "active", "rejected"]


class UserCreate(BaseModel):
    full_name: str = Field(min_length=2, max_length=255)
    email: str = Field(min_length=3, max_length=255)
    password: str = Field(min_length=6, max_length=255)
    role: RoleName


class UserLogin(BaseModel):
    email: str = Field(min_length=3, max_length=255)
    password: str = Field(min_length=6, max_length=255)


class UserOut(BaseModel):
    id: int
    full_name: str
    email: str
    role: RoleName
    status: UserStatus
    is_active: bool
    last_login: datetime | None = None

    class Config:
        from_attributes = True


class AuthResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


class RegistrationResponse(BaseModel):
    message: str
    status: UserStatus


class AccessRequestOut(BaseModel):
    id: int
    full_name: str
    email: str
    role: RoleName
    created_at: datetime

    class Config:
        from_attributes = True


class RoleUpdate(BaseModel):
    role: RoleName


class DetectPredictRequest(BaseModel):
    dataset: DatasetName
    features: dict[str, Any]


class ShapContribution(BaseModel):
    feature: str
    importance: float
    value: Any = None


class DetectPredictResponse(BaseModel):
    prediction: Literal["Benign", "Malicious"]
    attack_type: str
    probabilities: dict[str, float]
    confidence: float
    confidence_gate: ConfidenceGate
    used_features: list[str]
    shap_explanation: list[ShapContribution]
    dataset: str


class BatchPredictionRow(BaseModel):
    row_number: int
    verdict: Literal["Benign", "Malicious"]
    confidence: float
    confidence_gate: ConfidenceGate
    attack_type: str


class BatchPredictionResponse(BaseModel):
    dataset: str
    total_rows: int
    results: list[BatchPredictionRow]
    used_features: list[str]


class DatasetMetadata(BaseModel):
    dataset: str
    rows: int
    features: int
    class_balance: dict[str, float]
    feature_list: list[str]


class TrainStartRequest(BaseModel):
    dataset: DatasetName
    model_type: str = "LightGBM"
    hyperparameters: dict[str, Any] = Field(default_factory=dict)


class TrainRunSummary(BaseModel):
    run_id: str
    dataset: str
    model_type: str
    status: str
    metrics: dict[str, float]
    created_at: datetime


class PromoteResponse(BaseModel):
    run_id: str
    status: str
    auto_rollback_triggered: bool
    message: str


class DriftPoint(BaseModel):
    feature: str
    score: float
    threshold: float = 0.15


class AlertRecord(BaseModel):
    id: str
    title: str
    severity: Literal["HIGH", "MEDIUM", "LOW"]
    message: str
    created_at: datetime
    context: dict[str, Any] = Field(default_factory=dict)


class OverviewMetric(BaseModel):
    total_detections: int
    active_threats: int
    model_accuracy: float
    response_time: float
    service_count: int | None = None
    user_count: int | None = None


class AttackDistributionPoint(BaseModel):
    label: str
    value: int


class TimelinePoint(BaseModel):
    hour: str
    detections: int


class AdminSettings(BaseModel):
    detection_threshold: int = Field(ge=10, le=100, default=85)
    alert_frequency: Literal["Toutes les heures", "Every 30min", "Real-time"] = (
        "Real-time"
    )
    auto_retrain: bool = True
    system_retention_days: int = Field(ge=1, le=3650, default=30)
    notification_channels: list[Literal["Email", "Slack", "SMS"]] = Field(
        default_factory=lambda: ["Email", "Slack"]
    )


class PlatformStatus(BaseModel):
    service: str
    port: int
    status: Literal["UP", "DOWN"]
    uptime_percent: float
    detail: str
