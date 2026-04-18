"""Unit tests for the current LightGBM pipeline helpers."""

import numpy as np
import pandas as pd
import pytest

from model_pipeline import (
    FEATURE_MAP,
    build_preprocessor,
    list_dataset_files,
    make_xy,
    model_path_for,
    normalize_dataset_name,
)


@pytest.fixture
def sample_embb_df():
    """Minimal synthetic eMBB-style DataFrame for testing."""
    rng = np.random.default_rng(42)
    n = 100
    df = pd.DataFrame(
        {
            "Dur": rng.uniform(0, 5, n),
            "TotPkts": rng.integers(1, 500, n),
            "TotBytes": rng.integers(64, 100_000, n),
            "Rate": rng.uniform(0, 1000, n),
            "Load": rng.uniform(0, 50_000, n),
            "Loss": rng.uniform(0, 0.1, n),
            "pLoss": rng.uniform(0, 0.05, n),
            "TcpRtt": rng.uniform(0, 0.2, n),
            "Label": rng.choice(["Benign", "Malicious"], n),
        }
    )
    return df


@pytest.fixture
def sample_toniot_df():
    """Minimal synthetic TON_IoT-style DataFrame for testing."""
    rng = np.random.default_rng(7)
    n = 80
    df = pd.DataFrame(
        {
            "src_bytes": rng.integers(100, 200_000, n),
            "dst_bytes": rng.integers(100, 200_000, n),
            "src_pkts": rng.integers(1, 2000, n),
            "dst_pkts": rng.integers(1, 500, n),
            "duration": rng.uniform(0, 120, n),
            "proto": rng.choice(["tcp", "udp", "icmp"], n),
            "conn_state": rng.choice(["SF", "REJ", "RSTO", "S0"], n),
            "service": rng.choice(["http", "ssh", "-", "ftp"], n),
            "Label": rng.choice(["Benign", "Malicious"], n),
        }
    )
    return df


def test_make_xy_returns_correct_shapes(sample_embb_df):
    X, y = make_xy(sample_embb_df)
    assert len(X) == len(y) == len(sample_embb_df)
    assert "Label" not in X.columns


def test_make_xy_drops_metadata_columns():
    df = pd.DataFrame(
        {
            "Dur": [1.0],
            "TotPkts": [10],
            "Label": ["Benign"],
            "UniqueID": [99],
            "timestamp": ["2024-01-01"],
        }
    )
    X, _ = make_xy(df)
    assert "UniqueID" not in X.columns
    assert "timestamp" not in X.columns


def test_build_preprocessor_numeric(sample_embb_df):
    X, _ = make_xy(sample_embb_df)
    pre = build_preprocessor(X)
    X_proc = pre.fit_transform(X)
    assert X_proc.shape[0] == len(X)
    assert not np.any(np.isnan(X_proc))


def test_build_preprocessor_mixed(sample_toniot_df):
    X, _ = make_xy(sample_toniot_df)
    pre = build_preprocessor(X)
    X_proc = pre.fit_transform(X)
    assert X_proc.shape[0] == len(X)
    assert not np.any(np.isnan(X_proc))


def test_feature_map_all_datasets():
    for ds in ["mMTC", "URLLC", "eMBB", "TON_IoT"]:
        assert ds in FEATURE_MAP
        assert len(FEATURE_MAP[ds]) > 0


def test_normalize_dataset_name_alias():
    assert normalize_dataset_name("train_test_network") == "TON_IoT"
    assert normalize_dataset_name("eMBB") == "eMBB"


def test_list_dataset_files_contains_expected_keys():
    files = list_dataset_files()
    assert set(files) == {"mMTC", "URLLC", "eMBB", "TON_IoT"}


def test_model_path_for_uses_dataset_name():
    model_path = model_path_for("eMBB")
    assert model_path.name == "lightgbm_eMBB.joblib"
