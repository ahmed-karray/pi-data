from __future__ import annotations

import asyncio
from unittest.mock import AsyncMock

from app_web.backend.shared import elk_client


def test_emit_swallows_client_errors(monkeypatch):
    mock_client = AsyncMock()
    mock_client.index.side_effect = RuntimeError("boom")
    monkeypatch.setattr(elk_client, "_client", lambda: mock_client)

    asyncio.run(elk_client.emit("6g-ids-system", {"service": "test"}))

    mock_client.index.assert_awaited_once()
    mock_client.close.assert_awaited_once()
