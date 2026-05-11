# ⚠️ Concept Drift Monitoring Guide

## Overview

Concept drift occurs when the statistical properties of data change over time, which can degrade model performance. This system monitors two types of drift:

1. **Feature Drift**: Changes in input feature distributions
2. **Performance Drift**: Changes in model confidence and prediction patterns

## How It Works

### 1. Feature Drift Detection (Kolmogorov-Smirnov Test)

The KS test compares the distribution of recent data vs baseline data:

- **Null Hypothesis**: Distributions are the same
- **p-value < 0.05**: Reject null hypothesis → Drift detected
- **p-value ≥ 0.05**: Accept null hypothesis → No drift

**Example:**
```python
# Recent data: [100, 150, 200, 250]
# Baseline data: [50, 75, 100, 125]
# KS statistic: 0.75, p-value: 0.02 → DRIFT DETECTED
```

### 2. Performance Drift Detection

Monitors changes in:
- **Average Confidence**: Drop > 15% triggers alert
- **Malicious Rate**: Change > 50% triggers alert
- **Low Confidence Rate**: Increase indicates model uncertainty

## Using the Dashboard

### Step 1: Navigate to Drift Monitor
1. Open dashboard: `http://localhost:8501`
2. Click "⚠️ Drift Monitor" in sidebar

### Step 2: Configure Analysis
- **Select Dataset**: Choose network slice (mMTC, URLLC, eMBB, TON_IoT)
- **Recent Window**: Time window for recent data (default: 24 hours)
- **Baseline Window**: Time window for baseline data (default: 168 hours / 7 days)

### Step 3: Check for Drift
Click "🔍 Check for Drift" button

### Step 4: Interpret Results

#### ✅ No Drift Detected
```
✅ NO DRIFT DETECTED - Model is stable
✅ No feature drift detected
✅ No performance drift detected
```
**Action**: Continue monitoring, no action needed

#### ⚠️ Drift Detected
```
⚠️ DRIFT DETECTED - Model may need retraining
⚠️ Drift detected in 3 out of 8 features
⚠️ Performance drift detected
```

**Feature Drift Details:**
- Shows which features have drifted
- KS statistic and p-value for each feature
- Mean change percentage
- Visualization of drift severity

**Performance Drift Details:**
- Confidence change percentage
- Malicious rate change
- Comparison of recent vs baseline metrics

## API Endpoints

### 1. Check Overall Drift
```bash
curl "http://localhost:8000/drift/check?dataset=mMTC"
```

**Response:**
```json
{
  "mMTC": {
    "drift_detected": true,
    "feature_drift": {...},
    "performance_drift": {...},
    "recommendations": [
      "Feature drift detected in 3 features",
      "Consider retraining the model with recent data"
    ]
  }
}
```

### 2. Check Feature Drift Only
```bash
curl "http://localhost:8000/drift/features/mMTC?hours=24&baseline_hours=168"
```

### 3. Check Performance Drift Only
```bash
curl "http://localhost:8000/drift/performance/mMTC?hours=24&baseline_hours=168"
```

### 4. Check Retraining Recommendation
```bash
curl "http://localhost:8000/drift/retrain/mMTC"
```

**Response:**
```json
{
  "dataset": "mMTC",
  "should_retrain": true,
  "reason": "Significant feature drift detected in 3 features"
}
```

## Retraining Decision Logic

The system recommends retraining if:

1. **Feature Drift**: ≥3 features show significant drift
2. **Confidence Drop**: Average confidence drops by >15%
3. **Malicious Rate Change**: Malicious traffic rate changes by >50%

## Best Practices

### 1. Regular Monitoring
- Check drift daily for production systems
- Use auto-refresh in dashboard for real-time monitoring

### 2. Baseline Selection
- Use 7 days (168 hours) as baseline for stable comparison
- Adjust based on your traffic patterns

### 3. Threshold Tuning
- Default KS test threshold: p-value < 0.05
- Adjust in `drift_monitor.py` if needed:
```python
self.drift_thresholds = {
    "ks_test": 0.05,        # More sensitive: 0.10
    "f1_drop": 0.10,        # Less sensitive: 0.20
    "confidence_drop": 0.15 # More sensitive: 0.10
}
```

### 4. Retraining Strategy
- **Immediate**: Critical drift (>5 features, >20% confidence drop)
- **Scheduled**: Moderate drift (2-4 features, 10-20% confidence drop)
- **Monitor**: Minor drift (1 feature, <10% confidence drop)

## Example Scenarios

### Scenario 1: New Attack Pattern
```
Feature Drift: ✅ No drift
Performance Drift: ⚠️ Malicious rate increased 80%
Recommendation: Review attack patterns, update detection rules
```

### Scenario 2: Network Changes
```
Feature Drift: ⚠️ Drift in Rate, TotPkts, Loss
Performance Drift: ⚠️ Confidence dropped 18%
Recommendation: Retrain model with recent data
```

### Scenario 3: Seasonal Variation
```
Feature Drift: ⚠️ Drift in Dur, Load
Performance Drift: ✅ No drift
Recommendation: Monitor, may be normal variation
```

## Troubleshooting

### "Insufficient data for drift detection"
- **Cause**: Not enough predictions in time window
- **Solution**: Make more predictions or increase time window

### High false positive rate
- **Cause**: Threshold too sensitive
- **Solution**: Increase KS test threshold (e.g., 0.10)

### Drift not detected when expected
- **Cause**: Baseline window too short or threshold too strict
- **Solution**: Increase baseline window or decrease threshold

## Technical Details

### Kolmogorov-Smirnov Test
```python
from scipy import stats

statistic, p_value = stats.ks_2samp(baseline_data, current_data)

if p_value < 0.05:
    print("Drift detected!")
```

### Database Schema
```sql
CREATE TABLE drift_logs (
    id INTEGER PRIMARY KEY,
    timestamp DATETIME,
    dataset TEXT,
    drift_detected BOOLEAN,
    feature_drift_count INTEGER,
    confidence_drift BOOLEAN,
    malicious_rate_drift BOOLEAN,
    recommendations TEXT,
    should_retrain BOOLEAN,
    retrain_reason TEXT
)
```

## References

- Kolmogorov-Smirnov Test: https://en.wikipedia.org/wiki/Kolmogorov%E2%80%93Smirnov_test
- Concept Drift: https://en.wikipedia.org/wiki/Concept_drift
- SciPy Documentation: https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.ks_2samp.html

## Next Steps

1. ✅ Monitor drift regularly
2. ✅ Set up automated alerts (future enhancement)
3. ✅ Implement automated retraining (future enhancement)
4. ✅ Track drift history over time (future enhancement)
