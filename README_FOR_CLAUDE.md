# README For Claude

This file is a project-context handoff for AI coding assistants, especially Claude.

It explains:

- what the repository contains
- how `MLOPS` and `app_web` are different
- how they work together
- which files are the source of truth
- what each important file/folder is responsible for
- how the Docker stack is wired

## 1. Project Summary

This repository is a 6G Smart City Intrusion Detection System.

It has two major application layers:

- `MLOPS/`
  The machine learning and telemetry layer. It owns model training, model artifacts, MLflow tracking, drift logic, ELK logging, and a standalone FastAPI app.

- `app_web/`
  The product/web platform layer. It owns authentication, role-based UIs, gateway routing, backend microservices, and the bridge that reuses model logic and artifacts from `MLOPS/`.

There is also older legacy content at the repository root such as:

- `app.py`
- `streamlit_app/`
- notebooks

Those files are useful historical context, but the current integrated platform is primarily:

- `MLOPS/`
- `app_web/`
- root `docker-compose.yml`

## 2. High-Level Relationship Between `MLOPS` and `app_web`

The most important relationship is:

- `MLOPS` is the ML source of truth
- `app_web` is the application delivery layer

That means:

- `MLOPS` owns training pipelines, model bundle format, drift logic, MLflow runs, and ELK telemetry
- `app_web` consumes those capabilities through `backend/shared/mlops_bridge.py`
- `app_web` should not duplicate or replace the ML core unless intentionally refactored

In practice:

- `MLOPS/model_pipeline.py` defines how datasets are loaded, preprocessed, trained, and evaluated
- trained model artifacts are stored in `MLOPS/` as `lightgbm_<dataset>.joblib`
- `app_web/backend/shared/mlops_bridge.py` loads those artifacts and exposes prediction, batch prediction, drift summaries, training runs, and promotion helpers to the web microservices

So the dependency direction is:

`app_web -> MLOPS`

not the reverse.

## 3. Runtime Architecture

When the project is run from the root `docker-compose.yml`, the active stack is:

### MLOps infrastructure

- `mlops-api`
- `mlops-elasticsearch`
- `mlops-kibana`

### Web backend services

- `dev-gateway`
- `auth_service`
- `detection_service`
- `ml_training_service`
- `monitoring_service`
- `dashboard_service`
- `admin_service`

### Web frontends

- `analyst-ui`
- `scientist-ui`
- `admin-ui`

## 4. End-to-End Request Flow

### Authentication flow

1. User opens a frontend:
   - analyst: `3001`
   - scientist: `3002`
   - admin: `3003`
2. Frontend sends login request to `dev-gateway`
3. `dev-gateway` forwards `/auth/*` routes to `auth_service`
4. `auth_service` validates credentials and sets a JWT cookie
5. Frontend reads the user role and uses role-aware routes

### Detection flow

1. Frontend calls `dev-gateway`
2. `dev-gateway` forwards `/detect/*` to `detection_service`
3. `detection_service` calls `app_web.backend.shared.mlops_bridge.predict()`
4. `mlops_bridge` loads the model bundle from `MLOPS`
5. Prediction result is returned to the frontend and stored in SQLite via `PredictionRecord`

### Training flow

1. Frontend calls `/train/*` through `dev-gateway`
2. `dev-gateway` forwards to `ml_training_service`
3. `ml_training_service` calls `mlops_bridge.run_training()`
4. `run_training()` reuses training logic compatible with `MLOPS`
5. Metrics are logged to MLflow
6. Training state is stored in `TrainingRun`
7. A promoted model overwrites the champion model artifact path in `MLOPS`

### Monitoring flow

1. Frontend calls `/monitor/*` through `dev-gateway`
2. `dev-gateway` forwards to `monitoring_service`
3. `monitoring_service` calls `mlops_bridge.feature_drift()` and `metrics_over_time()`
4. Results are shown in the scientist/admin UI

## 5. Root-Level Important Files

### `docker-compose.yml`

Main orchestration file for the integrated platform.

It is the current source of truth for:

- MLOps containers
- web backend services
- split role-based frontends
- container networking
- mounts between repo folders and containers

### `README.md`

General project README. Good for high-level project purpose, but not enough alone for current architecture understanding.

### `Data5G/`

Dataset source directory used by both `MLOPS` and `app_web`.

Key files include:

- `eMBB.arff`
- `mMTC.arff`
- `URLLC.arff`

The CSV versions also exist under `app_web/public` and `app_web/dist` for UI usage, but the ML/training source of truth is still the main dataset pipeline.

### `streamlit_app/`

Legacy UI layer. Useful for historical context, but not the main integrated web platform.

### Notebooks

- `6G_IDS_updated.ipynb`
- `pi_4data.ipynb`

These are notebook-era artifacts used during model experimentation and earlier project stages.

## 6. `MLOPS/` Folder Guide

`MLOPS/` is the machine learning and telemetry subsystem.

### Core ML files

#### `MLOPS/model_pipeline.py`

This is the most important ML pipeline file.

Responsibilities:

- dataset alias mapping
- feature list definitions per dataset
- dataset loading
- preprocessing pipeline construction
- training LightGBM models
- evaluation
- MLflow logging
- artifact saving

This file is the main source of truth for:

- dataset names
- feature sets
- model artifact format

#### `MLOPS/main.py`

CLI entrypoint for training and pipeline operations.

Use this when the repo is being used in a more script-driven or MLOps-driven way outside the web stack.

#### `MLOPS/lightgbm_*.joblib`

Saved trained model bundles.

These artifacts are consumed by:

- `MLOPS/app.py`
- `app_web/backend/shared/mlops_bridge.py`

They are a key integration point.

### API and inference files

#### `MLOPS/app.py`

Standalone FastAPI app for direct ML API usage.

Responsibilities:

- preload trained models into memory
- run direct predictions
- run batch predictions
- generate SHAP explanations
- log predictions to database
- emit telemetry to Elasticsearch
- expose drift-related endpoints

This is useful as an independent MLOps API, but the product web platform mainly uses the `app_web` microservices.

#### `MLOPS/attack_classifier.py`

Maps malicious predictions to richer attack labels, severity, and recommended actions.

#### `MLOPS/shap_explainer.py`

SHAP explanation helper logic used for explainability output and plots.

#### `MLOPS/drift_monitor.py`

Feature drift and performance drift monitoring logic.

This is important conceptually because `app_web` has a lighter bridge implementation for monitoring, while this file is the deeper MLOps drift engine.

#### `MLOPS/database.py`

Standalone persistence helpers for the MLOps API.

### Monitoring and telemetry

#### `MLOPS/elk_logger.py`

Handles Elasticsearch logging and system metrics emission.

This powers Kibana-facing telemetry.

#### `MLOPS/dashboard.py`

Legacy Streamlit dashboard for the MLOps layer.

Useful for ML monitoring and demos, but separate from the role-based `app_web` UI.

### Docker and infra

#### `MLOPS/Dockerfile`

Builds the MLOps API container and starts:

- MLflow server
- FastAPI app

inside the same container.

#### `MLOPS/docker-compose.full.yml`

Standalone MLOps stack:

- API
- Elasticsearch
- Kibana

#### `MLOPS/docker-compose.monitoring.yml`

Monitoring-only ELK stack helper.

#### `MLOPS/docker/elasticsearch-entrypoint.sh`

Custom startup fix for Elasticsearch.

It helps recover from:

- corrupted keystore cases
- hostname resolution issues inside the container

### Quality and tests

#### `MLOPS/test_api.py`

API behavior tests.

#### `MLOPS/test_pipeline.py`

Training and pipeline tests.

#### `MLOPS/test_attack_classifier.py`

Attack label mapping tests.

#### `MLOPS/test_elk.py`

ELK connectivity and seeded telemetry tests.

### Supporting docs

These are supporting docs, not runtime code:

- `MLOPS/README.md`
- `MLOPS/PROJECT_SUMMARY.md`
- `MLOPS/DEPLOYMENT_GUIDE.md`
- `MLOPS/DRIFT_MONITORING_GUIDE.md`
- `MLOPS/DASHBOARD_GUIDE.md`
- `MLOPS/DOCKER_TROUBLESHOOTING.md`

They are useful for human onboarding.

## 7. `app_web/` Folder Guide

`app_web/` is the role-based application platform.

It has three main areas:

- `backend/`
- `frontend/`
- `docs/`

There is also some older root-level content inside `app_web/` from an earlier monolithic frontend layout.

## 8. `app_web/backend/` Guide

This is a microservice-style backend built with FastAPI.

### Shared backend infrastructure

#### `app_web/backend/Dockerfile.backend`

Shared container image definition for all backend services.

Each service uses the same build, but runs a different `uvicorn` command.

#### `app_web/backend/requirements.txt`

Backend dependency list for all web microservices.

#### `app_web/backend/docker-compose.yml`

Local `app_web`-only compose file for running the backend and the split frontends without the full repo stack.

This is useful for local app-web-only development.

### Shared code

#### `app_web/backend/shared/config.py`

One of the most important files in `app_web`.

Responsibilities:

- project path resolution
- MLOPS path resolution
- dataset directory resolution
- MLflow tracking URI
- default DB path
- service URL registry
- frontend URL registry
- allowed browser origins

If service names or ports change, this file usually needs to stay aligned.

#### `app_web/backend/shared/db.py`

Shared SQLAlchemy engine/session setup.

#### `app_web/backend/shared/models.py`

Shared database models.

Important entities include:

- `User`
- `PredictionRecord`
- `TrainingRun`
- settings-related models

#### `app_web/backend/shared/schemas.py`

Shared request/response Pydantic models.

#### `app_web/backend/shared/security.py`

Authentication and authorization utilities.

Responsibilities:

- password hashing
- JWT creation
- JWT decoding
- role guards
- default demo user seeding
- internal service token helpers

#### `app_web/backend/shared/store.py`

Static/demo dataset for dashboard-like payloads and convenience helpers.

Used by:

- dashboard service
- alert-like UI payloads
- model comparison views

#### `app_web/backend/shared/mlflow_store.py`

MLflow file-store cleanup helper.

Used to recover from broken local file-store experiment state.

#### `app_web/backend/shared/mlops_bridge.py`

This is the key integration file between `app_web` and `MLOPS`.

Responsibilities:

- load champion model bundles from `MLOPS`
- run inference
- run batch inference
- compute confidence gates
- compute SHAP-like explanation payloads
- read dataset metadata
- perform training runs
- evaluate runs
- promote challenger models
- compute simple feature drift summaries

If Claude needs to understand how `app_web` uses the ML layer, this is the first file to inspect.

## 9. `app_web/backend/` Services

### `gateway/app.py`

Browser-facing gateway.

Responsibilities:

- proxy `/auth/*`
- proxy `/detect/*`
- proxy `/train/*`
- proxy `/monitor/*`
- proxy `/dashboard/*`
- proxy `/admin/*`
- proxy UI routes for:
  - analyst
  - scientist
  - admin

Important detail:

The gateway is not just an API proxy. It also routes UI paths like:

- `/analyst/...`
- `/scientist/...`
- `/administrator/...`

### `auth_service/app.py`

Owns:

- login
- register
- list users
- update roles
- delete users
- internal user APIs
- account activation helpers

This service seeds default demo users at startup.

### `detection_service/app.py`

Owns:

- `/detect/datasets`
- `/detect/predict`
- `/detect/batch`
- `/detect/history`

It calls `shared.mlops_bridge.predict()` and `batch_predict()`.

This service is the main web-facing inference layer.

### `ml_training_service/app.py`

Owns:

- `/train/start`
- `/train/runs`
- `/train/runs/{run_id}`
- `/train/status/{run_id}`
- `/train/logs/{run_id}`
- `/train/promote/{run_id}`
- `/train/datasets`

Important behavior:

- runs training in background tasks
- stores training state in memory for live progress/log streaming
- stores persistent run info in the database
- reads MLflow runs and merges them with local DB state

### `monitoring_service/app.py`

Owns:

- drift summaries
- metrics timeline
- alert feed
- retrain trigger
- retrain status

This is the scientist/admin monitoring surface.

### `dashboard_service/app.py`

Owns:

- KPI overview
- attack distribution
- timeline
- model comparison
- alert feed
- websocket timeline stream

It is mostly dashboard payload assembly for the UIs.

### `admin_service/app.py`

Owns administrative views and orchestration behavior such as:

- user governance
- platform/service health
- settings
- permission-facing data

It depends on shared security and sometimes internal auth-service calls.

## 10. `app_web/frontend/` Guide

There are three separate role-based frontend apps:

- `frontend/analyst/`
- `frontend/scientist/`
- `frontend/admin/`

They share a similar structure.

### Common files in each frontend app

#### `package.json`

Frontend dependencies and scripts.

#### `vite.config.ts`

Vite build configuration.

#### `tsconfig.json`

TypeScript project config.

#### `tailwind.config.js`

Tailwind configuration.

#### `postcss.config.js`

PostCSS pipeline config.

#### `Dockerfile`

Builds the frontend and serves it via Nginx.

#### `nginx.conf`

Handles SPA fallback routing.

#### `index.html`

HTML entrypoint.

#### `public/swagger.yaml`

Role-specific Swagger/OpenAPI document exposed in the UI.

#### `src/main.tsx`

React bootstrap.

#### `src/index.css`

Global styles.

#### `src/role.ts`

Role identity and routing config.

This file is important because it controls:

- role label
- accent color
- menu configuration
- default home path
- cross-role redirect map

#### `src/App.tsx`

Main UI application for that role.

This typically contains:

- login flow
- route setup
- role-aware page access
- API calls through the gateway
- charts/tables/panels

### Role responsibilities

#### Analyst UI

Primary focus:

- dashboard
- live detection
- batch analysis
- read-only security operations views

#### Scientist UI

Primary focus:

- monitoring
- training
- drift metrics
- SHAP explanations
- model comparison

#### Admin UI

Primary focus:

- all major platform capabilities
- user management
- settings
- platform health
- broadest access level

## 11. `app_web/docs/`

This folder contains role-scoped OpenAPI/Swagger files:

- `swagger_analyst.yaml`
- `swagger_scientist.yaml`
- `swagger_admin.yaml`

These are documentation assets for the platform layer.

They help clarify intended role access boundaries.

## 12. Data, Models, and Source of Truth

### Source of truth for datasets

Operationally:

- datasets come from `Data5G/`

### Source of truth for feature definitions

- `MLOPS/model_pipeline.py`

### Source of truth for model artifacts

- `MLOPS/lightgbm_*.joblib`

### Source of truth for web-side ML integration

- `app_web/backend/shared/mlops_bridge.py`

### Source of truth for service-to-service routing

- `app_web/backend/shared/config.py`
- `app_web/backend/gateway/app.py`
- root `docker-compose.yml`

## 13. Docker Ports and Current Expected Access

With the current integrated root stack:

- Analyst UI: `http://localhost:3001`
- Scientist UI: `http://localhost:3002`
- Admin UI: `http://localhost:3003`
- Gateway: `http://localhost:8010`
- MLOps API: `http://localhost:8088/docs`
- MLflow: `http://localhost:5000`
- Elasticsearch: `http://localhost:9200`
- Kibana: `http://localhost:5601`

Backend service ports:

- Auth: `8001`
- Detection: `8002`
- Training: `8003`
- Monitoring: `8004`
- Dashboard: `8005`
- Admin: `8006`

## 14. Important Design Constraints

Claude should preserve these constraints unless intentionally redesigning the system:

### Constraint 1

`MLOPS` owns the ML core.

Do not casually reimplement feature maps, model loading rules, or training logic in `app_web`.

### Constraint 2

`app_web` is role-based and service-based.

Do not collapse the current split frontends and microservices unless that is an explicit product decision.

### Constraint 3

`mlops_bridge.py` is the bridge point.

If something breaks between the web product and the ML layer, inspect this file first.

### Constraint 4

Gateway routing must stay aligned with:

- backend service names
- frontend service names
- service URLs in `shared/config.py`
- Docker service names in `docker-compose.yml`

### Constraint 5

There is legacy code in the repo.

Do not assume every root-level file is part of the current production path.

## 15. Recommended Reading Order For Claude

If Claude needs to understand the project quickly, read in this order:

1. `README_FOR_CLAUDE.md`
2. `docker-compose.yml`
3. `app_web/backend/shared/config.py`
4. `app_web/backend/shared/mlops_bridge.py`
5. `app_web/backend/gateway/app.py`
6. `app_web/backend/detection_service/app.py`
7. `app_web/backend/ml_training_service/app.py`
8. `MLOPS/model_pipeline.py`
9. `MLOPS/app.py`
10. the relevant frontend `src/role.ts` and `src/App.tsx`

## 16. Short Mental Model

If Claude should remember only one thing, it is this:

`MLOPS` trains and owns the models.

`app_web` exposes those models through a role-based product made of:

- a gateway
- several FastAPI microservices
- three separate frontends

The bridge between them is:

- shared config
- shared DB/security models
- `app_web/backend/shared/mlops_bridge.py`
