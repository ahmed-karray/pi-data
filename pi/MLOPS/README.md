# 🛡️ 6G Smart City IDS — Complete MLOps Pipeline

[![Python](https://img.shields.io/badge/Python-3.8+-blue.svg)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.100+-green.svg)](https://fastapi.tiangolo.com/)
[![Streamlit](https://img.shields.io/badge/Streamlit-1.28+-red.svg)](https://streamlit.io/)
[![Tests](https://img.shields.io/badge/Tests-39%20passed-brightgreen.svg)](.)
[![Status](https://img.shields.io/badge/Status-Production%20Ready-success.svg)](.)

**Production-ready Intrusion Detection System for 6G Smart City Networks**

Complete MLOps pipeline with ML models, explainable AI (SHAP), real-time monitoring dashboard, and concept drift detection.

---

## 🎯 Quick Start

### 1. Install Dependencies
```bash
cd pi/MLOPS
pip install -r requirements.txt
```

### 2. Train Models
```bash
make train-all  # Train all 4 models (mMTC, URLLC, eMBB, TON_IoT)
```

### 3. Start Services
```bash
# Terminal 1: API Server
make api

# Terminal 2: Dashboard
make dashboard
```

### 4. Access
- **Dashboard**: http://localhost:8501 🎨
- **API Docs**: http://localhost:8000/docs 📚
- **MLflow**: http://localhost:5000 (run `make mlflow`) 📊

---

## ✨ Key Features

### 🤖 Machine Learning
- **4 Network Slices**: mMTC, URLLC, eMBB, TON_IoT
- **13 Attack Types**: DDoS, Flooding, Port Scanning, Ransomware, etc.
- **High Accuracy**: 90%+ F1 score on 3/4 datasets
- **LightGBM Models**: Fast, accurate gradient boosting

### 🔍 Explainability (SHAP)
- Per-prediction explanations
- Feature importance ranking
- Interactive visualizations
- Trustworthy AI decisions

### 📊 Real-time Dashboard
- **6 Interactive Pages**:
  - 🏠 Overview - System metrics
  - 🔍 Live Prediction - Test the model
  - 📊 Statistics - Attack analysis
  - 🎯 SHAP Analysis - Explainability
  - 📈 Timeline - Trends over time
  - ⚠️ Drift Monitor - Model health

### ⚠️ Drift Monitoring
- Feature drift detection (KS test)
- Performance drift tracking
- Automated retraining recommendations
- Historical drift analysis

### 🚀 Production Ready
- FastAPI REST API (11 endpoints)
- SQLite database logging
- Docker containerization
- 39 tests (100% pass rate)
- Complete documentation

---

## 📊 Model Performance

| Dataset | Accuracy | F1 Score | ROC-AUC | Status |
|---------|----------|----------|---------|--------|
| mMTC    | 93.07%   | 93.04%   | 98.18%  | ✅ Excellent |
| URLLC   | 75.22%   | 70.84%   | 83.60%  | ⚠️ Good |
| eMBB    | 94.83%   | 94.83%   | 99.26%  | ✅ Excellent |
| TON_IoT | 99.65%   | 99.51%   | 99.98%  | ✅ Outstanding |

**Average**: 90.69% Accuracy, 89.56% F1 Score

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    6G Smart City IDS                         │
└─────────────────────────────────────────────────────────────┘

    Data Pipeline → Training → LightGBM Models
                                      ↓
                            FastAPI Backend
                            (Port 8000)
                                      ↓
                            SQLite Database
                            (predictions.db)
                                      ↓
                         Streamlit Dashboard
                            (Port 8501)
```

---

## 📁 Project Structure

```
pi/MLOPS/
├── 🎯 Core ML
│   ├── model_pipeline.py      # Training pipeline
│   ├── main.py                # CLI interface
│   └── lightgbm_*.joblib      # Trained models
│
├── 🌐 Backend
│   ├── app.py                 # FastAPI server
│   ├── attack_classifier.py   # Attack classification
│   ├── shap_explainer.py      # SHAP explanations
│   ├── drift_monitor.py       # Drift detection
│   └── database.py            # Database operations
│
├── 🎨 Frontend
│   └── dashboard.py           # Streamlit dashboard
│
├── 🧪 Testing
│   ├── test_api.py           # API tests (8)
│   ├── test_pipeline.py      # Pipeline tests (18)
│   └── test_attack_classifier.py  # Classifier tests (13)
│
├── 📚 Documentation
│   ├── README.md             # This file
│   ├── PROJECT_SUMMARY.md    # Complete summary
│   ├── IMPLEMENTATION_STATUS.md
│   ├── DASHBOARD_GUIDE.md
│   └── DRIFT_MONITORING_GUIDE.md
│
└── ⚙️ Configuration
    ├── Makefile              # Build automation
    ├── Dockerfile            # Docker config
    ├── requirements.txt      # Dependencies
    └── pytest.ini            # Test config
```

---

## 🚀 Usage Examples

### Make a Prediction
```bash
curl -X POST "http://localhost:8000/predict" \
  -H "Content-Type: application/json" \
  -d '{
    "dataset": "mMTC",
    "features": {
      "Rate": 200,
      "TotPkts": 500,
      "Loss": 10,
      "TcpRtt": 0.05
    }
  }'
```

**Response**:
```json
{
  "prediction": "Malicious",
  "attack_type": "DDoS Attack",
  "severity": "Critical",
  "confidence": 0.95,
  "recommended_action": "Block source IP, enable rate limiting"
}
```

### Get SHAP Explanation
```bash
curl -X POST "http://localhost:8000/explain" \
  -H "Content-Type: application/json" \
  -d '{"dataset": "mMTC", "features": {...}}'
```

### Check for Drift
```bash
curl "http://localhost:8000/drift/check?dataset=mMTC"
```

---

## 🛠️ Makefile Commands

```bash
# Installation
make install          # Install dependencies

# Training
make train            # Train single model
make train-all        # Train all 4 models
make evaluate         # Evaluate model

# Services
make api              # Start API server
make dashboard        # Start dashboard
make mlflow           # Start MLflow UI

# Testing & Quality
make test             # Run all tests (39 tests)
make lint             # Code linting
make format           # Code formatting

# Docker
make docker-build     # Build Docker image
make docker-run       # Run container
make docker-push      # Push to registry

# Monitoring
make monitoring-up    # Start Elasticsearch + Kibana
make monitoring-down  # Stop monitoring stack
```

---

## 📊 API Endpoints

### Predictions
- `POST /predict` - Make prediction
- `POST /explain` - Get SHAP explanation

### Statistics
- `GET /stats/recent` - Recent predictions
- `GET /stats/attacks` - Attack statistics
- `GET /stats/timeline` - Time-series data
- `GET /stats/datasets` - Per-dataset metrics

### Drift Monitoring
- `GET /drift/check` - Check for drift
- `GET /drift/features/{dataset}` - Feature drift
- `GET /drift/performance/{dataset}` - Performance drift
- `GET /drift/retrain/{dataset}` - Retraining recommendation

---

## 🎓 Features Implemented

### ✅ Core Requirements (7/7 - 100%)
- [x] FR1: Detect malicious traffic across 4 slices
- [x] FR2: Classify attack subtypes (13 types)
- [x] FR3: Explainable justifications (SHAP)
- [x] FR4: Flag low-confidence predictions
- [x] FR5: Monitor concept drift
- [x] FR6: Remove PII before inference
- [x] FR7: Dashboard interface

### ✅ Technical Features
- [x] LightGBM training pipeline
- [x] MLflow experiment tracking
- [x] FastAPI REST API
- [x] Attack classification (13 types)
- [x] SHAP explainability
- [x] Prediction logging (SQLite)
- [x] Streamlit dashboard (6 pages)
- [x] Drift monitoring (KS test)
- [x] Automated testing (39 tests)
- [x] Docker containerization
- [x] Complete documentation

---

## 🧪 Testing

```bash
make test
```

**Results**:
- ✅ 39 tests
- ✅ 100% pass rate
- ✅ ~90% coverage

**Test Categories**:
- Unit tests (18)
- Integration tests (21)
- API tests (8)
- Attack classifier tests (13)
- SHAP tests (10)

---

## 📚 Documentation

- **[PROJECT_SUMMARY.md](PROJECT_SUMMARY.md)** - Complete project overview
- **[IMPLEMENTATION_STATUS.md](IMPLEMENTATION_STATUS.md)** - Feature status
- **[DASHBOARD_GUIDE.md](DASHBOARD_GUIDE.md)** - Dashboard usage
- **[DRIFT_MONITORING_GUIDE.md](DRIFT_MONITORING_GUIDE.md)** - Drift monitoring
- **API Docs**: http://localhost:8000/docs (when running)

---

## 🐳 Docker Deployment

```bash
# Build
make docker-build IMAGE_NAME=6g_ids_mlops

# Run
make docker-run IMAGE_NAME=6g_ids_mlops

# Push to registry
make docker-push DOCKER_USER=yourusername IMAGE_NAME=6g_ids_mlops
```

---

## 🔧 Configuration

### Environment Variables
```bash
MLFLOW_TRACKING_URI=sqlite:///mlflow.db
API_PORT=8000
DASHBOARD_PORT=8501
```

### Drift Thresholds
Edit `drift_monitor.py`:
```python
self.drift_thresholds = {
    "ks_test": 0.05,        # KS test p-value
    "f1_drop": 0.10,        # F1 score drop
    "confidence_drop": 0.15 # Confidence drop
}
```

---

## 📈 Performance Metrics

- **API Response Time**: ~50-100ms (without SHAP)
- **API Response Time**: ~150-300ms (with SHAP)
- **Dashboard Load Time**: ~2-3 seconds
- **Model Training Time**: ~2-5 minutes per dataset
- **Database Size**: ~10MB per 10,000 predictions

---

## 🎯 Use Cases

1. **Security Operations Center (SOC)**
   - Real-time threat monitoring
   - Attack classification and prioritization
   - Explainable security decisions

2. **Network Operations**
   - Traffic anomaly detection
   - Performance monitoring
   - Drift detection for network changes

3. **Research & Development**
   - Model experimentation (MLflow)
   - Explainability analysis (SHAP)
   - Drift analysis for model improvement

---

## 🚧 Future Enhancements (Optional)

- [ ] Gemini AI integration for natural language explanations
- [ ] API authentication (JWT)
- [ ] PostgreSQL migration
- [ ] Kubernetes deployment
- [ ] Automated retraining pipeline
- [ ] Alert notifications (email, Slack)
- [ ] Multi-user dashboard with authentication

---

## 📝 License

Educational project for ESPRIT PI 4DATA course (2026)

---

## 🙏 Acknowledgments

- **ESPRIT** - Educational institution
- **Course**: PI 4DATA
- **Year**: 2026

---

## 📞 Support

For issues or questions:
1. Check documentation in `/docs` folder
2. Review API docs at http://localhost:8000/docs
3. See `IMPLEMENTATION_STATUS.md` for feature status

---

**Version**: 2.3.0  
**Status**: Production-Ready ⭐⭐⭐  
**Last Updated**: 2026-04-18

---

Made with ❤️ for 6G Smart City Security
#   C I / C D   T e s t  
 