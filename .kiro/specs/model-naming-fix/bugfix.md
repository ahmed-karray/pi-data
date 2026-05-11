# Bugfix Requirements Document

## Introduction

The model naming system currently generates random timestamp-based names (e.g., "embb-20260508161157") when the `run_name` parameter is not explicitly provided to the `run_training()` function. This occurs in automatic retraining scenarios and test cases, making it difficult for users to identify and manage models. The expected behavior is to use a predictable, meaningful naming format: `{model_type}_{dataset}` (e.g., "lightgbm_eMBB", "lightgbm_mMTC").

**Affected Code:** `app_web/backend/shared/mlops_bridge.py`, line 247-248
```python
timestamp = _utc_now().strftime("%Y%m%d%H%M%S")
effective_run_name = run_name or f"{normalized}-{timestamp}"
```

**Impact:** Users see confusing timestamp-based model names in the training interface, making model identification and management difficult.

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN `run_name` parameter is None or not provided to `run_training()` THEN the system generates a timestamp-based name using format `{dataset}-{timestamp}` (e.g., "embb-20260508161157")

1.2 WHEN automatic retraining is triggered by the monitoring service THEN the system creates models with random timestamp names instead of meaningful identifiers

1.3 WHEN test cases call `run_training()` without specifying `run_name` THEN the system generates unpredictable timestamp-based names

### Expected Behavior (Correct)

2.1 WHEN `run_name` parameter is None or not provided to `run_training()` THEN the system SHALL generate a meaningful name using format `{model_type}_{dataset}` (e.g., "lightgbm_eMBB", "lightgbm_mMTC", "lightgbm_URLLC")

2.2 WHEN automatic retraining is triggered by the monitoring service THEN the system SHALL create models with predictable names following the `{model_type}_{dataset}` format

2.3 WHEN test cases call `run_training()` without specifying `run_name` THEN the system SHALL generate consistent, meaningful names using the `{model_type}_{dataset}` format

2.4 WHEN the same model+dataset combination is trained multiple times THEN the system SHALL use the same name for all runs, allowing MLflow to track them as separate runs with identical names (old runs are not deleted, but the name remains consistent)

2.5 WHEN `model_type` parameter is provided to `run_training()` THEN the system SHALL use it in the generated name format `{model_type}_{dataset}`

2.6 WHEN `model_type` parameter is not provided to `run_training()` THEN the system SHALL use a default value (e.g., "lightgbm") in the generated name format

### Unchanged Behavior (Regression Prevention)

3.1 WHEN `run_name` parameter is explicitly provided (e.g., `run_name=job_id` in ml_training_service) THEN the system SHALL CONTINUE TO use the provided name exactly as specified

3.2 WHEN training completes successfully THEN the system SHALL CONTINUE TO log metrics, parameters, and artifacts to MLflow with the same structure

3.3 WHEN model artifacts are saved THEN the system SHALL CONTINUE TO use the `challenger_bundle_path()` function with the run name to determine the artifact path

3.4 WHEN MLflow run metadata is created THEN the system SHALL CONTINUE TO include all existing tags (triggered_by, dataset, role) and parameters

3.5 WHEN callers do not provide the `model_type` parameter THEN the system SHALL CONTINUE TO function correctly using a default model type value
