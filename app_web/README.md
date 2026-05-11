# IOTinel `app_web`

Hexamind Security web platform for IOTinel.

This folder contains the full role-based web layer for the 6G Smart City IDS:

- `backend/` for the gateway and microservices
- `frontend/analyst/` for the Security Analyst UI
- `frontend/scientist/` for the Data Scientist UI
- `frontend/admin/` for the Administrator UI
- `docs/` for role-scoped Swagger/OpenAPI files

`/mlops/` is not modified by this layer. It remains the source of truth for model logic, training flow, preprocessing, and artifacts.

## 1. How To Run `app_web`

### Option A: Run with Docker

From the project root:

```powershell
cd app_web\backend
Copy-Item .env.example .env
docker compose up --build
```

Services and UIs:

- Gateway: `http://localhost:8010`
- Auth service: `http://localhost:8001`
- Detection service: `http://localhost:8002`
- ML training service: `http://localhost:8003`
- Monitoring service: `http://localhost:8004`
- Dashboard service: `http://localhost:8005`
- Admin service: `http://localhost:8006`
- Analyst UI: `http://localhost:3001`
- Scientist UI: `http://localhost:3002`
- Admin UI: `http://localhost:3003`

### Option B: Run backend manually

From the project root:

```powershell
cd app_web\backend
python -m venv .venv
.\.venv\Scripts\activate
pip install -r requirements.txt
Copy-Item .env.example .env
```

Then start each service in a separate terminal:

```powershell
python -m uvicorn app_web.backend.auth_service.app:app --reload --port 8001
python -m uvicorn app_web.backend.detection_service.app:app --reload --port 8002
python -m uvicorn app_web.backend.ml_training_service.app:app --reload --port 8003
python -m uvicorn app_web.backend.monitoring_service.app:app --reload --port 8004
python -m uvicorn app_web.backend.dashboard_service.app:app --reload --port 8005
python -m uvicorn app_web.backend.admin_service.app:app --reload --port 8006
python -m uvicorn app_web.backend.gateway.app:app --reload --port 8000
```

### Option C: Run frontends manually

Open 3 terminals.

Analyst:

```powershell
cd app_web\frontend\analyst
npm install
npm run dev
```

Scientist:

```powershell
cd app_web\frontend\scientist
npm install
npm run dev
```

Admin:

```powershell
cd app_web\frontend\admin
npm install
npm run dev
```

## 2. Everything Related To `app_web`

## Goal

`app_web` is the application delivery layer for IOTinel. Its job is to:

- authenticate users
- route users by role
- expose role-safe APIs
- show dashboards and prediction workflows
- trigger training and monitoring actions
- provide admin controls
- publish Swagger docs by role

## Main Structure

```text
app_web/
├── backend/
│   ├── gateway/
│   ├── auth_service/
│   ├── detection_service/
│   ├── ml_training_service/
│   ├── monitoring_service/
│   ├── dashboard_service/
│   ├── admin_service/
│   ├── shared/
│   ├── Dockerfile.backend
│   ├── requirements.txt
│   └── docker-compose.yml
├── frontend/
│   ├── analyst/
│   ├── scientist/
│   └── admin/
├── docs/
│   ├── swagger_analyst.yaml
│   ├── swagger_scientist.yaml
│   └── swagger_admin.yaml
└── README.md
```

## Demo Accounts

- Analyst: `analyst@hexamind.local` / `analyst123`
- Scientist: `scientist@hexamind.local` / `scientist123`
- Admin: `admin@hexamind.local` / `admin123`

## 3. How It Works

## Runtime Flow

1. A user opens one of the UIs or the shared login screen.
2. The UI sends login to `gateway` on port `8010`.
3. The gateway forwards the request to `auth_service`.
4. `auth_service` validates the user and returns a JWT cookie.
5. The frontend stores the user profile for routing and reads the role.
6. The user is redirected to the correct app:
   - analyst -> `3001`
   - scientist -> `3002`
   - admin -> `3003`
7. Frontend API calls go to `gateway`.
8. `gateway` forwards each call to the correct backend microservice.
9. Backend services use `backend/shared/` for schemas, DB, security, and ML bridge helpers.
10. ML-related services read from `/mlops/` and dataset sources without changing them.

## Backend Service Responsibilities

### `gateway/`

- single API entrypoint
- forwards `/auth/*`, `/detect/*`, `/train/*`, `/monitor/*`, `/dashboard/*`, `/admin/*`
- central place for browser-facing access

### `auth_service/`

- login
- user listing
- user creation
- role updates
- delete user
- current profile
- JWT + role-based access control

### `detection_service/`

- single prediction
- batch analysis
- prediction history
- confidence gate
- SHAP-style explanation payload

### `ml_training_service/`

- start training run
- list runs
- get run details
- promote champion
- dataset metadata

### `monitoring_service/`

- drift inspection
- model metrics over time
- alert feed
- retrain trigger
- monitoring health endpoint

### `dashboard_service/`

- KPI overview
- attack distribution
- detections timeline
- alert feed
- websocket timeline stream

### `admin_service/`

- user activation/deactivation
- platform settings
- service/platform health view
- permission matrix

## Frontend Role Responsibilities

### `frontend/analyst/`

- dashboard
- live detection
- batch analysis
- read-only model comparison
- analyst Swagger

### `frontend/scientist/`

- monitoring
- model comparison with training focus
- training
- drift metrics
- SHAP explanations
- scientist Swagger

### `frontend/admin/`

- everything from analyst + scientist
- user management
- settings
- platform health
- admin Swagger

## 4. Tools And Technologies

## Backend Tools

- FastAPI
- Uvicorn
- SQLAlchemy
- Pydantic
- JWT with `python-jose`
- password hashing with `passlib`
- Pandas / NumPy / SciPy
- MLflow bridge
- SHAP
- Docker

## Frontend Tools

- React
- TypeScript
- Vite
- Tailwind CSS
- Recharts
- Swagger UI React
- Nginx for static serving in containers

## Infra / Integration Tools

- Docker Compose
- role-based OpenAPI specs
- gateway routing
- local SQLite by default
- read-only mount of `/mlops/` and dataset path

## Environment Variables

Defined in `backend/.env.example`:

- `JWT_SECRET`
- `DATABASE_URL`
- `MLFLOW_TRACKING_URI`
- `REDIS_URL`

## 5. Full Report Of The Work

This is the work completed in `app_web` for the new architecture.

### Architecture Work

- Split the old monolithic app direction into:
  - backend microservices
  - three role-specific frontends
  - shared docs
- Kept `/mlops/` untouched as requested

### Backend Work

- created `backend/shared/` for shared logic
- created service folders:
  - `gateway`
  - `auth_service`
  - `detection_service`
  - `ml_training_service`
  - `monitoring_service`
  - `dashboard_service`
  - `admin_service`
- added compose and backend Dockerfile
- added shared config, DB layer, models, schemas, security helpers, and ML bridge

### Frontend Work

- created independent apps for analyst, scientist, and admin
- added role configuration per frontend
- added dedicated port per UI
- added role-based menus and home routes
- added per-role Swagger UI asset
- added nginx config per frontend for SPA serving

### Documentation Work

- added `docs/swagger_analyst.yaml`
- added `docs/swagger_scientist.yaml`
- added `docs/swagger_admin.yaml`
- added this README

### Known Notes

- there is still legacy content at the root of `app_web/` from the previous monolithic frontend
- cleanup was audited separately and some files were intentionally left for review rather than force deletion
- the new architecture lives under `backend/`, `frontend/`, and `docs/`

## 6. Meaning Of Each File And What It Does

Below is the practical meaning of each important kept file.

## Top Level

### `README.md`

- main handoff and usage documentation for `app_web`

### `__init__.py`

- marks `app_web` as a Python package so `uvicorn app_web.backend...` imports work

## Backend Root

### `backend/requirements.txt`

- Python dependencies for all backend services

### `backend/Dockerfile.backend`

- shared Docker build for backend service containers

### `backend/docker-compose.yml`

- starts gateway, backend services, and the 3 frontends together

### `backend/.env.example`

- sample environment variables file
- should be copied to `.env` before running compose or manual backend startup

## Shared Backend Files

### `backend/shared/config.py`

- central paths and settings
- defines service ports, service URLs, env loading defaults, and ML/data locations

### `backend/shared/db.py`

- database engine and session creation
- provides the shared SQLAlchemy base and DB dependency

### `backend/shared/models.py`

- SQLAlchemy tables:
  - users
  - prediction history
  - settings
  - training runs

### `backend/shared/schemas.py`

- shared Pydantic request/response schemas
- ensures service APIs speak the same shape

### `backend/shared/security.py`

- password hashing
- JWT creation and decode
- current user extraction
- role guard helpers
- default demo user seeding

### `backend/shared/store.py`

- shared in-memory/static demo data helpers
- attack distribution, alert list, model comparison, timelines

### `backend/shared/mlops_bridge.py`

- bridge between `app_web` and `/mlops/`
- loads model bundle
- computes prediction response
- handles confidence gate
- provides batch predict and metadata helpers
- computes drift-style metrics

## Backend Services

### `backend/auth_service/app.py`

- FastAPI app for auth and user lifecycle

### `backend/detection_service/app.py`

- FastAPI app for prediction, batch analysis, and history

### `backend/ml_training_service/app.py`

- FastAPI app for training runs, dataset metadata, and model promotion

### `backend/monitoring_service/app.py`

- FastAPI app for drift, alerts, retrain trigger, and health

### `backend/dashboard_service/app.py`

- FastAPI app for KPIs, charts, alerts, and websocket timeline

### `backend/admin_service/app.py`

- FastAPI app for settings, users, platform state, and permissions

### `backend/gateway/app.py`

- FastAPI gateway
- forwards incoming browser/API traffic to the correct service

### `backend/gateway/nginx.conf`

- optional nginx routing config kept with the gateway layer

## Frontend Files Per App

Each of the 3 frontend folders contains nearly the same infrastructure files:

### `package.json`

- frontend dependencies and scripts

### `tsconfig.json`

- TypeScript compile settings

### `tsconfig.node.json`

- Node/Vite-related TypeScript config

### `vite.config.ts`

- Vite bundler config

### `postcss.config.js`

- PostCSS config for Tailwind pipeline

### `tailwind.config.js`

- Tailwind scan/config settings

### `index.html`

- browser entry HTML for that UI

### `Dockerfile`

- builds the frontend and serves it with nginx

### `nginx.conf`

- SPA fallback config so routes work after refresh

### `public/swagger.yaml`

- role-specific Swagger spec used by the `/swagger` page

### `src/main.tsx`

- React bootstrap file

### `src/index.css`

- global styling, dark theme, glass UI, skeleton animation

### `src/role.ts`

- role identity for that app
- label, accent, redirect map, enabled routes, menu entries

### `src/App.tsx`

- main UI shell and pages for that role
- login screen
- layout
- route guards
- charts
- role-aware pages

## Docs Files

### `docs/swagger_analyst.yaml`

- global analyst OpenAPI spec

### `docs/swagger_scientist.yaml`

- global scientist OpenAPI spec

### `docs/swagger_admin.yaml`

- full admin OpenAPI spec

## Quick Role Summary

- Analyst accent: `#1D9E75`
- Scientist accent: `#185FA5`
- Admin accent: `#BA7517`

## Important Constraint

`app_web` depends on `/mlops/` and dataset files, but does not own them.

That means:

- do not retrain or alter `/mlops/` from outside approved service flows
- do not move model artifacts without updating the shared config bridge
- do not treat `app_web` as the ML source of truth

## Recommended Next Steps

- finish cleanup of old root monolithic files after review
- install backend and frontend dependencies in fresh envs
- verify import integrity after dependency install
- test all gateway routes end-to-end
- connect real persistent DB and Redis if production use is planned
