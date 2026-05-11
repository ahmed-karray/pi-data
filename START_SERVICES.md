# How to Fix "Request failed: /detect/predict" Error

## Problem
The error occurs because the backend microservices are not running. The application requires multiple services to work together.

## Solution

### 1. Start All Services with Docker Compose

```bash
# From the project root directory
docker compose up -d --build
```

This command will:
- Build all Docker images
- Start all microservices (MLOPS API, Gateway, Detection, Auth, etc.)
- Set up Elasticsearch and Kibana
- Initialize the database
- Start the frontend UIs

### 2. Wait for Services to Initialize

The services need time to start up and become healthy. You can monitor the progress:

```bash
# Check service status
docker compose ps

# Watch logs for all services
docker compose logs -f

# Watch logs for specific service
docker compose logs -f mlops-api
docker compose logs -f detection_service
```

### 3. Verify Services Are Running

Once all services show as "healthy", you can access:

| Service | URL | Purpose |
|---------|-----|---------|
| Analyst UI | http://localhost:3001 | Security Analyst Dashboard |
| Scientist UI | http://localhost:3002 | Data Scientist Dashboard |
| Admin UI | http://localhost:3003 | Administrator Dashboard |
| Gateway | http://localhost:8010 | API Gateway |
| MLOPS API | http://localhost:8088/docs | ML Prediction API (Swagger) |
| MLflow UI | http://localhost:5000 | MLflow Tracking UI |
| Elasticsearch | http://localhost:9200 | Search & Analytics |
| Kibana | http://localhost:5601 | Visualization Dashboard |

### 4. Test the Application

1. Open http://localhost:3001 in your browser
2. Login with default credentials:
   - Email: `analyst@hexamind.local`
   - Password: `analyst123`
3. Navigate to "Live Detection"
4. Select a dataset (e.g., eMBB)
5. Click "Generate Values" to populate sample data
6. Click "Predict and explain"

The prediction should now work!

## Troubleshooting

### If services fail to start:

```bash
# Stop all services
docker compose down

# Remove volumes (WARNING: This deletes data)
docker compose down -v

# Rebuild and restart
docker compose up -d --build
```

### Check individual service health:

```bash
# Check MLOPS API
curl http://localhost:8088/

# Check Gateway
curl http://localhost:8010/health

# Check Detection Service
curl http://localhost:8002/health
```

### View service logs:

```bash
# All services
docker compose logs

# Specific service
docker compose logs mlops-api
docker compose logs detection_service
docker compose logs dev-gateway
```

## Service Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Browser (Port 3001)                      │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│              Gateway (Port 8010)                             │
│              Routes requests to services                     │
└─────┬───────────┬───────────┬───────────┬───────────────────┘
      │           │           │           │
      ▼           ▼           ▼           ▼
┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐
│   Auth   │ │Detection │ │Dashboard │ │ Training │
│  (8001)  │ │  (8002)  │ │  (8005)  │ │  (8003)  │
└──────────┘ └────┬─────┘ └──────────┘ └──────────┘
                  │
                  ▼
         ┌─────────────────┐
         │   MLOPS API     │
         │   (Port 8088)   │
         │  ML Predictions │
         └─────────────────┘
```

## Quick Commands

```bash
# Start services
docker compose up -d

# Stop services
docker compose down

# Restart a specific service
docker compose restart detection_service

# View logs
docker compose logs -f

# Check status
docker compose ps

# Rebuild and restart
docker compose up -d --build
```

## Default Login Credentials

| Role | Email | Password |
|------|-------|----------|
| Security Analyst | analyst@hexamind.local | analyst123 |
| Data Scientist | scientist@hexamind.local | scientist123 |
| Administrator | admin@hexamind.local | admin123 |
