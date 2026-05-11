from __future__ import annotations

import asyncio
from unittest.mock import AsyncMock

from app_web.backend.shared import mlops_bridge


def test_predict_uses_http_bridge(monkeypatch):
    mock_request = AsyncMock(return_value={"prediction": "Benign"})
    monkeypatch.setattr(mlops_bridge, "_request", mock_request)

    payload = asyncio.run(mlops_bridge.predict("eMBB", {"Dur": 1.2}))

    assert payload == {"prediction": "Benign"}
    mock_request.assert_awaited_once_with(
        "POST",
        "/predict",
        json={"dataset": "eMBB", "features": {"Dur": 1.2}},
    )


def test_batch_predict_uses_http_bridge(monkeypatch):
    mock_request = AsyncMock(return_value={"total": 1})
    monkeypatch.setattr(mlops_bridge, "_request", mock_request)

    payload = asyncio.run(mlops_bridge.batch_predict("eMBB", [{"Dur": 1.2}]))

    assert payload == {"total": 1}
    mock_request.assert_awaited_once()
    assert mock_request.await_args.kwargs["json"]["samples"] == [{"Dur": 1.2}]
