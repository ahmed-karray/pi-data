"""FastAPI endpoint tests using the current API contract."""

from pathlib import Path
import pytest
from fastapi.testclient import TestClient

from app import app

client = TestClient(app)

# Check if models are available
BASE_DIR = Path(__file__).resolve().parent
MODELS_AVAILABLE = all(
    [
        (BASE_DIR / "lightgbm_mMTC.joblib").exists(),
        (BASE_DIR / "lightgbm_eMBB.joblib").exists(),
        (BASE_DIR / "lightgbm_URLLC.joblib").exists(),
    ]
)


def test_root_health():
    r = client.get("/")
    assert r.status_code == 200
    assert "message" in r.json()


def test_predict_missing_dataset():
    r = client.post(
        "/predict",
        json={
            "dataset": "NONEXISTENT",
            "features": {"Dur": 1.0},
        },
    )
    assert r.status_code == 400


def test_predict_embb_returns_structure():
    """Predict endpoint returns expected keys when a model is available."""
    r = client.post(
        "/predict",
        json={
            "dataset": "eMBB",
            "features": {
                "Dur": 0.2,
                "TotPkts": 15,
                "TotBytes": 4800,
                "Rate": 75.0,
                "Load": 1200.0,
                "Loss": 0.0,
                "pLoss": 0.01,
                "TcpRtt": 0.001,
            },
        },
    )
    assert r.status_code in (200, 404)
    if r.status_code == 200:
        body = r.json()
        assert "prediction" in body
        assert "probabilities" in body
        assert "used_features" in body


# SHAP Explainability Tests


@pytest.mark.skipif(not MODELS_AVAILABLE, reason="Model files not found")
def test_predict_with_shap_explanation():
    """Test /predict endpoint with SHAP explanation enabled"""
    r = client.post(
        "/predict",
        json={
            "dataset": "mMTC",
            "features": {
                "TotPkts": 500,
                "Rate": 200,
                "SrcGap": 0.01,
                "DstGap": 0.02,
                "Dur": 10.5,
                "Load": 0.8,
                "Loss": 10,
                "TcpRtt": 0.05,
            },
            "explain": True,
        },
    )

    assert r.status_code == 200
    data = r.json()

    # Check standard prediction fields
    assert "prediction" in data
    assert "confidence" in data
    assert "attack_type" in data

    # Check SHAP explanation fields
    assert "shap_explanation" in data
    shap_exp = data["shap_explanation"]

    assert "shap_values" in shap_exp
    assert "base_value" in shap_exp
    assert "feature_importance" in shap_exp
    assert "top_features" in shap_exp
    assert "explanation" in shap_exp
    assert "prediction_score" in shap_exp

    # Verify SHAP values structure
    assert isinstance(shap_exp["shap_values"], list)
    assert len(shap_exp["shap_values"]) > 0
    assert isinstance(shap_exp["base_value"], (int, float))

    # Verify feature importance
    assert isinstance(shap_exp["feature_importance"], list)
    assert len(shap_exp["feature_importance"]) > 0

    # Verify top features
    assert isinstance(shap_exp["top_features"], list)
    assert len(shap_exp["top_features"]) <= 5

    # Verify explanation text
    assert isinstance(shap_exp["explanation"], str)
    assert "Prediction:" in shap_exp["explanation"]


@pytest.mark.skipif(not MODELS_AVAILABLE, reason="Model files not found")
def test_predict_without_shap_explanation():
    """Test /predict endpoint without SHAP explanation"""
    r = client.post(
        "/predict",
        json={
            "dataset": "mMTC",
            "features": {
                "TotPkts": 500,
                "Rate": 100,
                "SrcGap": 0.01,
                "DstGap": 0.02,
                "Dur": 10.5,
                "Load": 0.8,
                "Loss": 5,
                "TcpRtt": 0.05,
            },
            "explain": False,
        },
    )

    assert r.status_code == 200
    data = r.json()

    # Check standard prediction fields
    assert "prediction" in data
    assert "confidence" in data

    # SHAP explanation should not be present
    assert "shap_explanation" not in data


@pytest.mark.skipif(not MODELS_AVAILABLE, reason="Model files not found")
def test_predict_with_plots():
    """Test /predict endpoint with SHAP plots generation"""
    r = client.post(
        "/predict",
        json={
            "dataset": "mMTC",
            "features": {
                "TotPkts": 500,
                "Rate": 200,
                "SrcGap": 0.01,
                "DstGap": 0.02,
                "Dur": 10.5,
                "Load": 0.8,
                "Loss": 10,
                "TcpRtt": 0.05,
            },
            "explain": True,
            "generate_plots": True,
        },
    )

    assert r.status_code == 200
    data = r.json()

    # Check SHAP explanation
    assert "shap_explanation" in data

    # Check visualizations
    assert "visualizations" in data
    viz = data["visualizations"]

    # Bar plot should be present
    assert "bar_plot" in viz
    if viz["bar_plot"]:
        assert viz["bar_plot"].startswith("data:image/png;base64,")

    # Waterfall plot should be present
    assert "waterfall_plot" in viz


@pytest.mark.skipif(not MODELS_AVAILABLE, reason="Model files not found")
def test_explain_endpoint():
    """Test dedicated /explain endpoint"""
    r = client.post(
        "/explain",
        json={
            "dataset": "eMBB",
            "features": {
                "Dur": 15.0,
                "TotPkts": 1000,
                "TotBytes": 50000,
                "Rate": 150,
                "Load": 0.9,
                "Loss": 8,
                "pLoss": 0.8,
                "TcpRtt": 0.06,
            },
        },
    )

    assert r.status_code == 200
    data = r.json()

    # Should have both prediction and explanation
    assert "prediction" in data
    assert "shap_explanation" in data
    assert "visualizations" in data


@pytest.mark.skipif(not MODELS_AVAILABLE, reason="Model files not found")
def test_shap_multiple_datasets():
    """Test SHAP explanations work for all datasets"""
    datasets = {
        "mMTC": {
            "TotPkts": 500,
            "Rate": 100,
            "SrcGap": 0.01,
            "DstGap": 0.02,
            "Dur": 10.5,
            "Load": 0.8,
            "Loss": 5,
            "TcpRtt": 0.05,
        },
        "URLLC": {
            "TcpRtt": 0.05,
            "SynAck": 0.01,
            "AckDat": 0.02,
            "Loss": 5,
            "Dur": 10.0,
            "Rate": 100,
            "TotPkts": 500,
            "TotBytes": 25000,
        },
        "eMBB": {
            "Dur": 15.0,
            "TotPkts": 1000,
            "TotBytes": 50000,
            "Rate": 150,
            "Load": 0.9,
            "Loss": 8,
            "pLoss": 0.8,
            "TcpRtt": 0.06,
        },
    }

    for dataset, features in datasets.items():
        r = client.post(
            "/predict",
            json={"dataset": dataset, "features": features, "explain": True},
        )

        assert r.status_code == 200
        data = r.json()
        assert "shap_explanation" in data
        assert "shap_values" in data["shap_explanation"]
