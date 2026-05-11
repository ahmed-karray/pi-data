from __future__ import annotations

import shutil
from pathlib import Path

from .config import MLFLOW_TRACKING_URI


def cleanup_broken_file_store_experiments() -> None:
    # Only applies to local file-store URIs.
    if "://" in MLFLOW_TRACKING_URI:
        return
    root = Path(MLFLOW_TRACKING_URI)
    if not root.exists() or not root.is_dir():
        return
    for child in root.iterdir():
        if not child.is_dir() or not child.name.isdigit():
            continue
        meta = child / "meta.yaml"
        if not meta.exists():
            shutil.rmtree(child, ignore_errors=True)
