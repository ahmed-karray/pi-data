"""FastAPI endpoint tests using the current API contract."""

from fastapi.testclient import TestClient

from app import app

client = TestClient(app)


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
