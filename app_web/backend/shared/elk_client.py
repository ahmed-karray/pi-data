from __future__ import annotations

from datetime import datetime, timezone
import logging
import threading
from typing import Any

from elasticsearch import AsyncElasticsearch

from .config import ELASTICSEARCH_TIMEOUT, ELASTICSEARCH_URL

logger = logging.getLogger(__name__)

# Kibana index patterns to register after the first documents arrive:
# - 6g-ids-predictions-*
# - 6g-ids-training-*
# - 6g-ids-drift-*
# - 6g-ids-auth-*
# - 6g-ids-system-*


def _utc_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _index_name(index: str) -> str:
    stamp = datetime.now(timezone.utc).strftime("%Y.%m.%d")
    return f"{index}-{stamp}"


def _client() -> AsyncElasticsearch:
    return AsyncElasticsearch(
        hosts=[ELASTICSEARCH_URL], request_timeout=ELASTICSEARCH_TIMEOUT
    )


async def emit(index: str, doc: dict[str, Any]) -> None:
    payload = {
        "@timestamp": doc.get("@timestamp", _utc_iso()),
        "service": doc.get("service", "unknown"),
        "event_type": doc.get("event_type", "system"),
        "level": doc.get("level", "info"),
        **doc,
    }
    client = _client()
    try:
        await client.index(index=_index_name(index), document=payload)
    except Exception:
        logger.exception("Failed to emit document to Elasticsearch index %s", index)
    finally:
        await client.close()


def emit_nowait(index: str, doc: dict[str, Any]) -> None:
    try:
        loop = None
        try:
            loop = __import__("asyncio").get_running_loop()
        except RuntimeError:
            loop = None
        if loop is not None:
            loop.create_task(emit(index, doc))
            return
    except Exception:
        logger.exception("Failed to schedule Elasticsearch emission in running loop")

    def _runner() -> None:
        try:
            __import__("asyncio").run(emit(index, doc))
        except Exception:
            logger.exception(
                "Failed to emit document to Elasticsearch from background thread"
            )

    thread = threading.Thread(target=_runner, daemon=True)
    thread.start()
