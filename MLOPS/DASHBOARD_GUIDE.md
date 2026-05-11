# 🛡️ 6G Smart City IDS Dashboard Guide

## Quick Start

### 1. Start the API Server
```bash
cd pi/MLOPS
make api
```

The API will be available at `http://localhost:8000`

### 2. Start the Dashboard
```bash
# In a new terminal
make dashboard
```

The dashboard will open automatically at `http://localhost:8501`

## Dashboard Pages

### 🏠 Overview
**Real-time system monitoring**

- **Key Metrics**: Total predictions, malicious/benign counts, average confidence
- **Attack Type Distribution**: Pie chart showing attack type breakdown
- **Severity Distribution**: Bar chart showing severity levels
- **Dataset Performance**: Table with metrics per dataset

**Use Case**: Quick system health check and attack overview

### 🔍 Live Prediction
**Interactive prediction interface**

1. Select dataset (mMTC, URLLC, eMBB, TON_IoT)
2. Enter feature values
3. Enable SHAP explanation (optional)
4. Enable visualizations (optional)
5. Click "Predict"

**Results Display**:
- Prediction (Malicious/Benign)
- Attack type and severity
- Confidence score
- Recommended actions
- SHAP explanation with visualizations

**Use Case**: Test the model with custom traffic samples

### 📊 Statistics
**Attack statistics and recent activity**

- **Summary Metrics**: Total predictions, attack rate, avg confidence
- **Attack Types Breakdown**: Table with counts and percentages
- **Recent Predictions**: Last 20 predictions with details

**Filters**:
- Dataset: Filter by specific network slice
- Time Range: Last hour, 6 hours, 24 hours, 7 days

**Use Case**: Analyze attack patterns and trends

### 🎯 SHAP Analysis
**Explainability documentation**

- What is SHAP?
- How to use SHAP explanations
- Interpretation guide
- Feature attribution explanation

**Use Case**: Learn about model explainability

### 📈 Timeline
**Predictions over time**

- **Line Chart**: Malicious vs Benign predictions over time
- **Confidence Chart**: Average confidence trends
- **Data Table**: Detailed timeline data

**Filters**:
- Time Range: Adjustable time window
- Dataset: Filter by network slice

**Use Case**: Monitor trends and detect anomalies

## Features

### Auto-Refresh
Enable auto-refresh in the sidebar to update data every 30 seconds

### Filters
- **Dataset Filter**: View data for specific network slices
- **Time Range**: Adjust historical data window

### API Status
The sidebar shows API connection status:
- ✅ Green: API connected
- ❌ Red: API offline

## Database

Predictions are automatically logged to `predictions.db` with:
- Timestamp
- Dataset and features
- Prediction and confidence
- Attack type and severity
- SHAP values (if generated)
- Response time

## Tips

1. **Start with Overview**: Get a quick system health check
2. **Use Live Prediction**: Test specific scenarios
3. **Check Statistics**: Analyze attack patterns
4. **Monitor Timeline**: Detect trends and anomalies
5. **Enable Auto-Refresh**: For real-time monitoring

## Troubleshooting

### Dashboard shows "API Offline"
- Make sure the API server is running: `make api`
- Check API is accessible at `http://localhost:8000`

### No data in charts
- Make some predictions first using the Live Prediction page
- Or use the API directly to generate test data

### Slow performance
- Reduce time range filter
- Disable auto-refresh
- Clear old predictions: See database.py `clear_old_predictions()`

## Architecture

```
┌─────────────┐
│  Dashboard  │ (Streamlit - Port 8501)
│  (Frontend) │
└──────┬──────┘
       │ HTTP Requests
       ▼
┌─────────────┐
│  FastAPI    │ (Port 8000)
│  (Backend)  │
└──────┬──────┘
       │
       ├─► LightGBM Models
       ├─► SHAP Explainer
       ├─► Attack Classifier
       └─► SQLite Database
```

## Next Steps

- Add authentication (optional)
- Implement drift monitoring alerts
- Add export functionality (PDF reports)
- Integrate Gemini AI for natural language insights

## Support

For issues or questions, check:
- `IMPLEMENTATION_STATUS.md` - Feature status
- `README.md` - Project overview
- API docs: `http://localhost:8000/docs`
