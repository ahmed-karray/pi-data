"""
test_elk.py — Verify ELK integration end-to-end.

Prerequisite: Elasticsearch must be running on localhost:9200
  → make monitoring-up

Usage:
  python test_elk.py            # send sample data + verify
  python test_elk.py --seed 50  # seed 50 fake predictions for Kibana dashboards
"""

import argparse
import random
import sys
import time

from elk_logger import get_elk_logger

DATASETS = ["eMBB", "mMTC", "URLLC", "TON_IoT"]
ATTACKS = [
    "Benign",
    "DDoS",
    "Reconnaissance",
    "Injection",
    "Brute Force",
    "Backdoor",
    "Ransomware",
    "XSS",
]
SEVERITIES = ["Low", "Medium", "High", "Critical"]


def test_connection():
    """Test 1: basic connectivity."""
    elk = get_elk_logger()
    if not elk.enabled:
        print("❌ FAIL: Cannot connect to Elasticsearch")
        return False
    if not elk.ping():
        print("❌ FAIL: Elasticsearch ping failed")
        return False
    print("✅ PASS: Connected to Elasticsearch")
    return True


def test_prediction_logging():
    """Test 2: log a single prediction and verify it was indexed."""
    elk = get_elk_logger()
    elk.log_prediction(
        dataset="mMTC",
        prediction="Malicious",
        attack_type="DDoS",
        severity="High",
        confidence=0.9423,
        alert_status="Confirmed Attack",
        response_time_ms=12.34,
    )
    # Give ES a moment to index
    time.sleep(1.5)
    try:
        result = elk.client.search(
            index="ids-predictions",
            body={"query": {"match": {"attack_type": "DDoS"}}},
            size=1,
        )
        hits = result["hits"]["total"]["value"]
        if hits > 0:
            print(f"✅ PASS: Prediction indexed (ids-predictions has {hits} docs)")
            return True
        else:
            print("❌ FAIL: Prediction not found in ids-predictions")
            return False
    except Exception as exc:
        print(f"❌ FAIL: Search error — {exc}")
        return False


def test_model_metrics():
    """Test 3: log model metrics."""
    elk = get_elk_logger()
    elk.log_model_metrics(
        dataset="eMBB",
        accuracy=0.9483,
        f1_macro=0.8950,
        roc_auc=0.9926,
        event_type="test",
    )
    time.sleep(1)
    try:
        count = elk.client.count(index="ids-metrics")["count"]
        print(f"✅ PASS: Model metrics indexed (ids-metrics has {count} docs)")
        return True
    except Exception as exc:
        print(f"❌ FAIL: {exc}")
        return False


def test_system_metrics():
    """Test 4: log system metrics."""
    elk = get_elk_logger()
    elk.log_system_metrics()
    time.sleep(1)
    try:
        count = elk.client.count(index="ids-system")["count"]
        print(f"✅ PASS: System metrics indexed (ids-system has {count} docs)")
        return True
    except Exception as exc:
        print(f"❌ FAIL: {exc}")
        return False


def test_drift_alert():
    """Test 5: log a drift alert."""
    elk = get_elk_logger()
    elk.log_drift_alert(
        dataset="URLLC",
        drift_detected=True,
        drift_type="feature",
        recommendation="Retrain model with recent data",
        should_retrain=True,
    )
    time.sleep(1)
    try:
        count = elk.client.count(index="ids-drift")["count"]
        print(f"✅ PASS: Drift alert indexed (ids-drift has {count} docs)")
        return True
    except Exception as exc:
        print(f"❌ FAIL: {exc}")
        return False


def test_status_endpoint():
    """Test 6: ELKLogger.status() returns correct shape."""
    elk = get_elk_logger()
    s = elk.status()
    checks = [
        s.get("enabled") is True,
        isinstance(s.get("doc_counts"), dict),
        "ids-predictions" in s.get("doc_counts", {}),
    ]
    if all(checks):
        print(f"✅ PASS: status() shape OK — {s['doc_counts']}")
        return True
    else:
        print(f"❌ FAIL: status() unexpected — {s}")
        return False


def seed_predictions(n: int):
    """Seed N realistic-looking predictions for Kibana dashboard demos."""
    elk = get_elk_logger()
    if not elk.enabled:
        print("❌ Cannot seed: Elasticsearch unreachable")
        return

    print(f"🌱 Seeding {n} predictions into ids-predictions …")
    for i in range(n):
        is_malicious = random.random() < 0.35
        dataset = random.choice(DATASETS)
        attack = random.choice(ATTACKS[1:]) if is_malicious else "Benign"
        severity = random.choice(SEVERITIES) if is_malicious else "Low"
        confidence = round(random.uniform(0.55, 0.99), 4)
        alert = "Confirmed Attack" if is_malicious else "Benign Traffic"

        elk.log_prediction(
            dataset=dataset,
            prediction="Malicious" if is_malicious else "Benign",
            attack_type=attack,
            severity=severity,
            confidence=confidence,
            alert_status=alert,
            response_time_ms=round(random.uniform(5, 80), 2),
        )

    # Also seed model training metrics
    print("🌱 Seeding model metrics …")
    for ds in DATASETS:
        elk.log_model_metrics(
            dataset=ds,
            accuracy=round(random.uniform(0.85, 0.98), 4),
            f1_macro=round(random.uniform(0.80, 0.96), 4),
            roc_auc=round(random.uniform(0.90, 0.99), 4),
            event_type="training",
        )

    # System metrics
    elk.log_system_metrics()

    time.sleep(2)
    print(f"✅ Done. Final counts: {elk.index_counts()}")


def main():
    parser = argparse.ArgumentParser(description="ELK integration test suite")
    parser.add_argument(
        "--seed",
        type=int,
        default=0,
        help="Seed N fake predictions into Elasticsearch for Kibana demos",
    )
    args = parser.parse_args()

    if args.seed > 0:
        seed_predictions(args.seed)
        return

    print("=" * 60)
    print("  6G IDS — ELK Integration Tests")
    print("=" * 60)

    tests = [
        test_connection,
        test_prediction_logging,
        test_model_metrics,
        test_system_metrics,
        test_drift_alert,
        test_status_endpoint,
    ]

    passed = 0
    for t in tests:
        try:
            if t():
                passed += 1
        except Exception as exc:
            print(f"❌ EXCEPTION in {t.__name__}: {exc}")

    print("=" * 60)
    print(f"  Result: {passed}/{len(tests)} tests passed")
    print("=" * 60)

    if passed < len(tests):
        sys.exit(1)


if __name__ == "__main__":
    main()
