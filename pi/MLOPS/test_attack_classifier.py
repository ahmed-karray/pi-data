"""Tests for Attack Classification Service"""

import pytest
from attack_classifier import AttackClassifier, get_classifier


@pytest.fixture
def classifier():
    return AttackClassifier()


def test_classifier_singleton():
    """Test that get_classifier returns singleton instance"""
    c1 = get_classifier()
    c2 = get_classifier()
    assert c1 is c2


def test_benign_classification(classifier):
    """Test that benign traffic is not classified as attack"""
    features = {"Rate": 50, "TotPkts": 100, "Loss": 0}
    result = classifier.classify("mMTC", features, "Benign")
    assert result == "Benign"


def test_mmtc_ddos_classification(classifier):
    """Test mMTC DDoS attack classification"""
    features = {"Rate": 200, "TotPkts": 500, "Loss": 10, "TcpRtt": 0.05}
    result = classifier.classify("mMTC", features, "Malicious")
    assert result == "DDoS Attack"


def test_mmtc_flooding_classification(classifier):
    """Test mMTC flooding attack classification"""
    features = {"Rate": 50, "TotPkts": 2000, "Loss": 2, "TcpRtt": 0.05}
    result = classifier.classify("mMTC", features, "Malicious")
    assert result == "Flooding Attack"


def test_urllc_latency_attack(classifier):
    """Test URLLC latency manipulation attack"""
    features = {"TcpRtt": 0.8, "Loss": 2, "Rate": 50, "Dur": 1.0}
    result = classifier.classify("URLLC", features, "Malicious")
    assert result == "Latency Manipulation Attack"


def test_embb_bandwidth_exhaustion(classifier):
    """Test eMBB bandwidth exhaustion attack"""
    features = {"TotBytes": 100000, "Rate": 100, "Load": 15000, "Loss": 1}
    result = classifier.classify("eMBB", features, "Malicious")
    assert result == "Bandwidth Exhaustion Attack"


def test_toniot_ddos(classifier):
    """Test TON_IoT DDoS attack"""
    features = {
        "src_bytes": 5000,
        "dst_bytes": 1000,
        "src_pkts": 2000,
        "dst_pkts": 100,
        "duration": 5,
        "proto": "tcp",
        "conn_state": "SF",
        "service": "http",
    }
    result = classifier.classify("TON_IoT", features, "Malicious")
    assert result == "DDoS Attack"


def test_toniot_port_scanning(classifier):
    """Test TON_IoT port scanning"""
    features = {
        "src_bytes": 500,
        "dst_bytes": 100,
        "src_pkts": 200,
        "dst_pkts": 50,
        "duration": 10,
        "proto": "tcp",
        "conn_state": "REJ",
        "service": "-",
    }
    result = classifier.classify("TON_IoT", features, "Malicious")
    assert result == "Port Scanning"


def test_toniot_ransomware(classifier):
    """Test TON_IoT ransomware detection"""
    features = {
        "src_bytes": 150000,
        "dst_bytes": 5000,
        "src_pkts": 500,
        "dst_pkts": 100,
        "duration": 60,
        "proto": "tcp",
        "conn_state": "SF",
        "service": "smb",
    }
    result = classifier.classify("TON_IoT", features, "Malicious")
    assert result == "Ransomware"


def test_severity_levels(classifier):
    """Test severity classification"""
    assert classifier.get_attack_severity("DDoS Attack") == "Critical"
    assert classifier.get_attack_severity("Port Scanning") == "Medium"
    assert classifier.get_attack_severity("Benign") == "None"
    assert classifier.get_attack_severity("Unknown") == "Low"


def test_recommended_actions(classifier):
    """Test recommended action generation"""
    action = classifier.get_recommended_action("DDoS Attack")
    assert "Block source IP" in action
    assert "rate limiting" in action

    action = classifier.get_recommended_action("Ransomware")
    assert "Isolate" in action

    action = classifier.get_recommended_action("Benign")
    assert "No action required" in action


def test_unknown_dataset(classifier):
    """Test handling of unknown dataset"""
    features = {"Rate": 100}
    result = classifier.classify("UNKNOWN", features, "Malicious")
    assert result == "Unknown Attack"


def test_all_datasets_supported(classifier):
    """Test that all expected datasets are supported"""
    datasets = ["mMTC", "URLLC", "eMBB", "TON_IoT"]
    for dataset in datasets:
        assert dataset in classifier.rules
