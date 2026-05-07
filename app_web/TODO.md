# Fix Plan: API Proxy Errors (ECONNREFUSED + 404)

## Root Causes
1. **Gateway not running**: Nothing on localhost:8000 → ECONNREFUSED
2. **Missing MLOps service**: No service at localhost:8003 for /models, /stats, /dashboard/*, /monitor/*, /retrain, /evaluate
3. **Gateway routing gaps**: /models, /stats, /dashboard/*, /retrain, /evaluate, /alerts, /monitor/* not explicitly proxied
4. **userService.ts bypasses proxy**: Calls http://localhost:8000 directly instead of /api

## Steps

- [ ] Step 1: Create `services/mlops-service/` microservice (port 8003)
  - Copy app.py, model_pipeline.py, utils from `pi/MLOPS/`
  - Create Dockerfile, requirements.txt, __init__.py
  - Configure to run on port 8003
  
- [ ] Step 2: Update `services/gateway/app.py`
  - Add explicit routes for `/models`, `/stats`, `/dashboard/{path}`, `/retrain`, `/evaluate`, `/alerts`, `/monitor/{path}`
  - Route all dashboard/monitoring/training endpoints to `mlops` service
  - Update catch-all fallback to handle `models`, `stats`, `dashboard`, `retrain`, `evaluate`, `alerts`, `monitor` prefixes
  
- [ ] Step 3: Update `docker-compose.yml`
  - Add `mlops-service` container (port 8003)
  - Add `depends_on` links
  
- [ ] Step 4: Fix `src/services/api/userService.ts`
  - Change `API_BASE_URL` from `http://localhost:8000` to `/api`
  
- [ ] Step 5: Create `start-services.bat`
  - Script to start auth (8001), detection (8002), mlops (8003), gateway (8000) manually
  
- [ ] Step 6: Verify & Test
  - Start services and confirm /health, /models, /predict respond correctly

