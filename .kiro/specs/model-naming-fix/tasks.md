# Implementation Plan

- [ ] 1. Write bug condition exploration test
  - **Property 1: Bug Condition** - Timestamp-Based Names When run_name is None
  - **CRITICAL**: This test MUST FAIL on unfixed code - failure confirms the bug exists
  - **DO NOT attempt to fix the test or the code when it fails**
  - **NOTE**: This test encodes the expected behavior - it will validate the fix when it passes after implementation
  - **GOAL**: Surface counterexamples that demonstrate the bug exists (timestamp-based names instead of meaningful names)
  - **Scoped PBT Approach**: Scope the property to concrete failing cases: run_name=None with various datasets (eMBB, mMTC, URLLC, TON_IoT)
  - Test that when `run_training()` is called with `run_name=None`, the system generates timestamp-based names matching pattern `{dataset}-\d{14}` (from Bug Condition in design)
  - The test assertions should match the Expected Behavior Properties from design: run_name should be `{model_type}_{dataset}` format
  - Run test on UNFIXED code
  - **EXPECTED OUTCOME**: Test FAILS (this is correct - it proves the bug exists)
  - Document counterexamples found (e.g., "run_training('eMBB', {}, run_name=None) returns 'embb-20260508190314' instead of 'lightgbm_eMBB'")
  - Mark task complete when test is written, run, and failure is documented
  - _Requirements: 1.1, 1.2, 1.3_

- [ ] 2. Write preservation property tests (BEFORE implementing fix)
  - **Property 2: Preservation** - Explicit run_name Behavior Unchanged
  - **IMPORTANT**: Follow observation-first methodology
  - Observe behavior on UNFIXED code for explicit run_name inputs (cases where run_name is provided, not None)
  - Write property-based tests capturing observed behavior patterns from Preservation Requirements:
    - When run_name is explicitly provided, the system uses that exact name
    - MLflow tracking, metrics logging, and artifact saving work identically
    - challenger_bundle_path() uses the provided run_name
    - All existing tags and parameters are logged to MLflow
  - Property-based testing generates many test cases for stronger guarantees
  - Run tests on UNFIXED code
  - **EXPECTED OUTCOME**: Tests PASS (this confirms baseline behavior to preserve)
  - Mark task complete when tests are written, run, and passing on unfixed code
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [ ] 3. Fix for model naming to use meaningful format

  - [ ] 3.1 Implement the fix in mlops_bridge.py
    - Add `model_type` parameter to `run_training()` function signature with default value "lightgbm"
    - Replace timestamp-based name generation logic (lines 247-248) with meaningful format: `effective_run_name = run_name or f"{model_type}_{normalized}"`
    - Remove unused `timestamp` variable when run_name is None
    - Ensure backward compatibility by using default parameter value
    - _Bug_Condition: isBugCondition(input) where input.run_name IS None AND effective_run_name_generated MATCHES pattern "{dataset}-{timestamp}"_
    - _Expected_Behavior: For any call to run_training() where run_name is None, generate name using format {model_type}_{dataset} (e.g., "lightgbm_eMBB")_
    - _Preservation: When run_name is explicitly provided, use that exact name without modification and preserve all MLflow tracking, artifact saving, and metadata logging_
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 3.1, 3.2, 3.3, 3.4, 3.5_

  - [ ] 3.2 Verify bug condition exploration test now passes
    - **Property 1: Expected Behavior** - Meaningful Model Names
    - **IMPORTANT**: Re-run the SAME test from task 1 - do NOT write a new test
    - The test from task 1 encodes the expected behavior (meaningful names with format {model_type}_{dataset})
    - When this test passes, it confirms the expected behavior is satisfied
    - Run bug condition exploration test from step 1
    - **EXPECTED OUTCOME**: Test PASSES (confirms bug is fixed)
    - Verify run_name matches format "lightgbm_{dataset}" for all test cases (eMBB, mMTC, URLLC, TON_IoT)
    - Verify run_name does NOT match timestamp pattern "{dataset}-\d{14}"
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6_

  - [ ] 3.3 Verify preservation tests still pass
    - **Property 2: Preservation** - Explicit run_name Behavior Unchanged
    - **IMPORTANT**: Re-run the SAME tests from task 2 - do NOT write new tests
    - Run preservation property tests from step 2
    - **EXPECTED OUTCOME**: Tests PASS (confirms no regressions)
    - Confirm all tests still pass after fix (no regressions in explicit run_name behavior)
    - Verify MLflow tracking, artifact paths, and metadata logging work identically for explicit run_name calls
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [ ] 4. Checkpoint - Ensure all tests pass
  - Run all tests (bug condition exploration + preservation tests)
  - Verify all tests pass on fixed code
  - Verify no regressions in existing functionality
  - Ask the user if questions arise or if additional validation is needed
