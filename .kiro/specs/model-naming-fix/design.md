# Model Naming Fix Bugfix Design

## Overview

The model naming system currently generates timestamp-based names (e.g., "embb-20260508190314") when the `run_name` parameter is not explicitly provided to the `run_training()` function. This makes it difficult for users to identify and manage models in automatic retraining scenarios and test cases. The fix will modify the name generation logic in `mlops_bridge.py` to use a predictable format: `{model_type}_{dataset}` (e.g., "lightgbm_eMBB") when `run_name` is not provided, while preserving the existing behavior when `run_name` is explicitly specified.

## Glossary

- **Bug_Condition (C)**: The condition that triggers the bug - when `run_name` is None/not provided and the system generates timestamp-based names instead of meaningful names
- **Property (P)**: The desired behavior when `run_name` is None - the system should generate names using format `{model_type}_{dataset}`
- **Preservation**: Existing behavior when `run_name` is explicitly provided must remain unchanged
- **run_training()**: The function in `app_web/backend/shared/mlops_bridge.py` that orchestrates model training and MLflow tracking
- **effective_run_name**: The variable that determines the final run name used for MLflow tracking and artifact paths
- **model_type**: The machine learning algorithm used (e.g., "lightgbm", "xgboost") - currently hardcoded as LightGBM in the codebase

## Bug Details

### Bug Condition

The bug manifests when `run_training()` is called without an explicit `run_name` parameter (i.e., `run_name=None`). The function generates a timestamp-based name using the format `{normalized_dataset}-{timestamp}` (e.g., "embb-20260508190314"), which is unpredictable and makes model identification difficult.

**Formal Specification:**
```
FUNCTION isBugCondition(input)
  INPUT: input of type RunTrainingCall
  OUTPUT: boolean
  
  RETURN input.run_name IS None
         AND effective_run_name_generated MATCHES pattern "{dataset}-{timestamp}"
         AND effective_run_name_generated DOES NOT MATCH pattern "{model_type}_{dataset}"
END FUNCTION
```

### Examples

- **Example 1**: Call `run_training("eMBB", {}, run_name=None)` → Current: "embb-20260508190314" | Expected: "lightgbm_eMBB"
- **Example 2**: Call `run_training("mMTC", {}, run_name=None)` → Current: "mmtc-20260508190315" | Expected: "lightgbm_mMTC"
- **Example 3**: Call `run_training("URLLC", {}, run_name=None)` → Current: "urllc-20260508190316" | Expected: "lightgbm_URLLC"
- **Example 4**: Call `run_training("TON_IoT", {}, run_name=None)` → Current: "ton_iot-20260508190317" | Expected: "lightgbm_TON_IoT"

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**
- When `run_name` is explicitly provided (e.g., `run_name="embb-20260508190314"` from ml_training_service), the system must use that exact name
- MLflow tracking, metrics logging, and artifact saving must continue to work exactly as before
- The `challenger_bundle_path()` function must continue to use the run name to determine artifact paths
- All existing tags (triggered_by, dataset, role) and parameters must continue to be logged to MLflow

**Scope:**
All inputs where `run_name` is explicitly provided should be completely unaffected by this fix. This includes:
- Calls from `ml_training_service/app.py` which generates job_id and passes it as `run_name`
- Any test cases that explicitly provide `run_name`
- Any future callers that want to control the run name explicitly

## Hypothesized Root Cause

Based on the bug description and code analysis, the root cause is clear:

1. **Hardcoded Timestamp Logic**: Lines 247-248 in `mlops_bridge.py` use a timestamp-based fallback:
   ```python
   timestamp = _utc_now().strftime("%Y%m%d%H%M%S")
   effective_run_name = run_name or f"{normalized}-{timestamp}"
   ```
   This logic does not consider the model type and always generates timestamp-based names when `run_name` is None.

2. **Missing Model Type Parameter**: The `run_training()` function does not accept a `model_type` parameter, even though the codebase exclusively uses LightGBM (as seen in `model_pipeline.py`).

3. **No Default Naming Strategy**: There is no fallback naming strategy that uses meaningful identifiers like model type and dataset name.

## Correctness Properties

Property 1: Bug Condition - Meaningful Model Names

_For any_ call to `run_training()` where `run_name` is None or not provided, the fixed function SHALL generate a name using the format `{model_type}_{dataset}` (e.g., "lightgbm_eMBB", "lightgbm_mMTC"), where model_type defaults to "lightgbm" if not provided.

**Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5, 2.6**

Property 2: Preservation - Explicit Run Name Behavior

_For any_ call to `run_training()` where `run_name` is explicitly provided (not None), the fixed function SHALL produce exactly the same behavior as the original function, using the provided run_name without modification and preserving all MLflow tracking, artifact saving, and metadata logging.

**Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5**

## Fix Implementation

### Changes Required

Assuming our root cause analysis is correct:

**File**: `app_web/backend/shared/mlops_bridge.py`

**Function**: `run_training()`

**Specific Changes**:

1. **Add model_type Parameter**: Add an optional `model_type` parameter to the `run_training()` function signature with a default value of "lightgbm":
   ```python
   def run_training(
       dataset: str,
       params: dict[str, Any] | None = None,
       role: str = "data_scientist",
       triggered_by: str = "web_ui",
       run_name: str | None = None,
       model_type: str = "lightgbm",  # NEW PARAMETER
       log_callback: Callable[[str], None] | None = None,
   ) -> dict[str, Any]:
   ```

2. **Replace Timestamp Logic**: Replace lines 247-248 with meaningful name generation:
   ```python
   # OLD CODE (lines 247-248):
   # timestamp = _utc_now().strftime("%Y%m%d%H%M%S")
   # effective_run_name = run_name or f"{normalized}-{timestamp}"
   
   # NEW CODE:
   effective_run_name = run_name or f"{model_type}_{normalized}"
   ```

3. **Remove Unused Timestamp Variable**: The `timestamp` variable is no longer needed when `run_name` is None, so it can be removed entirely.

4. **Update Callers (Optional)**: If any callers want to specify a different model type in the future, they can pass the `model_type` parameter. The default value ensures backward compatibility.

### Implementation Notes

- The fix is minimal and focused on the specific bug condition
- The default value "lightgbm" matches the actual model type used throughout the codebase (see `model_pipeline.py`)
- The fix maintains backward compatibility because the `model_type` parameter has a default value
- The fix does not affect explicit `run_name` usage (e.g., from `ml_training_service/app.py`)

## Testing Strategy

### Validation Approach

The testing strategy follows a two-phase approach: first, surface counterexamples that demonstrate the bug on unfixed code, then verify the fix works correctly and preserves existing behavior.

### Exploratory Bug Condition Checking

**Goal**: Surface counterexamples that demonstrate the bug BEFORE implementing the fix. Confirm the root cause analysis by observing timestamp-based names in the unfixed code.

**Test Plan**: Write tests that call `run_training()` without providing `run_name` and capture the generated `effective_run_name`. Run these tests on the UNFIXED code to observe timestamp-based names and confirm the bug.

**Test Cases**:
1. **eMBB Dataset Test**: Call `run_training("eMBB", {}, run_name=None)` and verify the returned run_name matches pattern `embb-\d{14}` (will fail on unfixed code - should be "lightgbm_eMBB")
2. **mMTC Dataset Test**: Call `run_training("mMTC", {}, run_name=None)` and verify the returned run_name matches pattern `mmtc-\d{14}` (will fail on unfixed code - should be "lightgbm_mMTC")
3. **URLLC Dataset Test**: Call `run_training("URLLC", {}, run_name=None)` and verify the returned run_name matches pattern `urllc-\d{14}` (will fail on unfixed code - should be "lightgbm_URLLC")
4. **TON_IoT Dataset Test**: Call `run_training("TON_IoT", {}, run_name=None)` and verify the returned run_name matches pattern `ton_iot-\d{14}` (will fail on unfixed code - should be "lightgbm_TON_IoT")

**Expected Counterexamples**:
- Run names will contain timestamps like "embb-20260508190314" instead of "lightgbm_eMBB"
- Possible causes: hardcoded timestamp logic in lines 247-248, missing model_type parameter

### Fix Checking

**Goal**: Verify that for all inputs where the bug condition holds (run_name is None), the fixed function produces the expected behavior (meaningful names with format `{model_type}_{dataset}`).

**Pseudocode:**
```
FOR ALL input WHERE isBugCondition(input) DO
  result := run_training_fixed(input.dataset, input.params, run_name=None)
  ASSERT result.run_name == f"{model_type}_{normalized_dataset}"
  ASSERT result.run_name DOES NOT MATCH pattern ".*-\d{14}"
END FOR
```

**Test Cases**:
1. **eMBB with None**: Call fixed `run_training("eMBB", {}, run_name=None)` → Assert run_name == "lightgbm_eMBB"
2. **mMTC with None**: Call fixed `run_training("mMTC", {}, run_name=None)` → Assert run_name == "lightgbm_mMTC"
3. **URLLC with None**: Call fixed `run_training("URLLC", {}, run_name=None)` → Assert run_name == "lightgbm_URLLC"
4. **TON_IoT with None**: Call fixed `run_training("TON_IoT", {}, run_name=None)` → Assert run_name == "lightgbm_TON_IoT"
5. **Custom Model Type**: Call fixed `run_training("eMBB", {}, run_name=None, model_type="xgboost")` → Assert run_name == "xgboost_eMBB"

### Preservation Checking

**Goal**: Verify that for all inputs where the bug condition does NOT hold (run_name is explicitly provided), the fixed function produces the same result as the original function.

**Pseudocode:**
```
FOR ALL input WHERE NOT isBugCondition(input) DO
  ASSERT run_training_original(input) = run_training_fixed(input)
END FOR
```

**Testing Approach**: Property-based testing is recommended for preservation checking because:
- It generates many test cases automatically across the input domain
- It catches edge cases that manual unit tests might miss
- It provides strong guarantees that behavior is unchanged for all explicit run_name inputs

**Test Plan**: Observe behavior on UNFIXED code first for explicit run_name calls, then write property-based tests capturing that behavior.

**Test Cases**:
1. **Explicit Job ID Preservation**: Call with `run_name="embb-20260508190314"` on both unfixed and fixed code → Assert identical behavior (run_name, artifact_path, MLflow tracking)
2. **Explicit Custom Name Preservation**: Call with `run_name="my-custom-experiment"` on both unfixed and fixed code → Assert identical behavior
3. **MLflow Tracking Preservation**: Verify that MLflow run creation, metrics logging, and artifact logging work identically for explicit run_name calls
4. **Artifact Path Preservation**: Verify that `challenger_bundle_path(run_name)` produces the same path for explicit run_name calls

### Unit Tests

- Test name generation with `run_name=None` for each dataset (eMBB, mMTC, URLLC, TON_IoT)
- Test name generation with explicit `run_name` values
- Test name generation with custom `model_type` parameter
- Test that artifact paths use the generated run name correctly
- Test that MLflow tracking uses the generated run name correctly

### Property-Based Tests

- Generate random dataset names and verify meaningful name format when `run_name=None`
- Generate random explicit run_name values and verify preservation of exact name
- Generate random combinations of parameters and verify MLflow tracking consistency
- Test that multiple training runs with the same dataset produce the same name (allowing MLflow to track them as separate runs)

### Integration Tests

- Test full training flow with `run_name=None` and verify meaningful names in MLflow UI
- Test full training flow with explicit `run_name` and verify exact name preservation
- Test that ml_training_service continues to work correctly (it provides explicit run_name)
- Test that artifact files are created with correct names based on run_name
