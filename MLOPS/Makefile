# =============================================================================
# Makefile - 6G Smart City IDS MLOps Pipeline (Windows Friendly)
# =============================================================================

ifeq ($(OS),Windows_NT)
SHELL := cmd.exe
.SHELLFLAGS := /C
PYTHON ?= python
VENV_ACTIVATE_MSG := Activate with: venv\Scripts\activate
else
PYTHON ?= python3
VENV_ACTIVATE_MSG := Activate with: source venv/bin/activate
endif

PIP         := $(PYTHON) -m pip
VENV        := venv
DATASET     ?= eMBB
IMAGE_NAME  ?= 6g_ids_mlops
DOCKER_USER ?= ramiklouz
TAG         ?= latest
MLFLOW_PORT := 5000
API_PORT    := 8000
ES_PORT     := 9200
KIBANA_PORT := 5601

.PHONY: all install venv list-data prepare train train-all evaluate api api-bg \
        mlflow mlflow-bg lint format format-check security test \
        docker-build docker-run docker-stop docker-push docker-images docker-clean \
        monitoring-up monitoring-down monitoring-status clean help

# ======================
# MAIN PIPELINE
# ======================

all: install lint test train-all
	@echo Full pipeline complete.

venv:
	$(PYTHON) -m venv $(VENV)
	@echo $(VENV_ACTIVATE_MSG)

install:
	$(PIP) install -r requirements.txt
	@echo Dependencies installed.

# ======================
# DATA & TRAINING
# ======================

list-data:
	$(PYTHON) main.py --list-data

prepare:
	$(PYTHON) main.py --prepare --dataset $(DATASET)

train:
	$(PYTHON) main.py --train --dataset $(DATASET)

train-all:
	$(PYTHON) main.py --all

evaluate:
	$(PYTHON) main.py --evaluate --dataset $(DATASET)

# ======================
# API
# ======================

api:
	$(PYTHON) -m uvicorn app:app --reload --host 0.0.0.0 --port $(API_PORT)

api-bg:
	start "6G IDS API" /B $(PYTHON) -m uvicorn app:app --host 0.0.0.0 --port $(API_PORT)

# ======================
# MLFLOW
# ======================

mlflow:
	mlflow server --backend-store-uri sqlite:///mlflow.db --default-artifact-root ./mlruns --host 0.0.0.0 --port $(MLFLOW_PORT)

mlflow-bg:
	start "MLflow" /B mlflow server --backend-store-uri sqlite:///mlflow.db --default-artifact-root ./mlruns --host 0.0.0.0 --port $(MLFLOW_PORT)
	@echo MLflow UI: http://localhost:$(MLFLOW_PORT)

# ======================
# CODE QUALITY
# ======================

lint:
	$(PYTHON) -m flake8 . --jobs=1 --max-line-length=100 --exclude=$(VENV),__pycache__,.git

format:
	$(PYTHON) -m black . --line-length 100

format-check:
	$(PYTHON) -m black . --line-length 100 --check

security:
	$(PYTHON) -m bandit -r . -x venv -ll

test:
	$(PYTHON) -m pytest test_api.py test_pipeline.py test_attack_classifier.py -v --tb=short

# ======================
# DOCKER
# ======================

docker-build:
	docker build -t $(IMAGE_NAME):$(TAG) .
	@echo Image built: $(IMAGE_NAME):$(TAG)

docker-run:
	docker run -d --name 6g_ids_container -p $(API_PORT):$(API_PORT) -p $(MLFLOW_PORT):$(MLFLOW_PORT) -e MLFLOW_TRACKING_URI=http://host.docker.internal:$(MLFLOW_PORT) $(IMAGE_NAME):$(TAG)
	@echo API: http://localhost:$(API_PORT)/docs

docker-stop:
	-docker stop 6g_ids_container
	-docker rm 6g_ids_container

docker-clean:
	-docker rmi $(IMAGE_NAME):$(TAG)

docker-push:
	docker tag $(IMAGE_NAME):$(TAG) $(DOCKER_USER)/$(IMAGE_NAME):$(TAG)
	docker push $(DOCKER_USER)/$(IMAGE_NAME):$(TAG)
	@echo Image pushed: $(DOCKER_USER)/$(IMAGE_NAME):$(TAG)

docker-images:
	docker images

# ======================
# MONITORING
# ======================

monitoring-up:
	docker compose -f docker-compose.monitoring.yml up -d
	@echo Elasticsearch: http://localhost:$(ES_PORT)
	@echo Kibana: http://localhost:$(KIBANA_PORT)

monitoring-down:
	docker compose -f docker-compose.monitoring.yml down

monitoring-status:
	$(PYTHON) -c "import json, urllib.request; print(json.dumps(json.load(urllib.request.urlopen('http://localhost:$(ES_PORT)/_cluster/health')), indent=2))"

elk-test:
	$(PYTHON) -c "from elk_logger import get_elk_logger; elk=get_elk_logger(); elk.log_model_metrics('eMBB',0.9483,0.9483,0.9926,'test'); print('[OK] Test metrics sent to Elasticsearch')"

elk-status:
	$(PYTHON) -c "from elk_logger import get_elk_logger; import json; print(json.dumps(get_elk_logger().status(), indent=2))"

elk-indices:
	$(PYTHON) -c "import json, urllib.request; data=json.load(urllib.request.urlopen('http://localhost:$(ES_PORT)/_cat/indices?format=json')); [print(f'{d[\"index\"]:<25} {d[\"docs.count\"]:>8} docs') for d in sorted(data, key=lambda x: x['index']) if d['index'].startswith('ids-')]"

full-up:
	docker compose -f docker-compose.full.yml up -d --build
	@echo.
	@echo   FastAPI  : http://localhost:8000
	@echo   MLflow   : http://localhost:5000
	@echo   Kibana   : http://localhost:5601
	@echo   Elasticsearch: http://localhost:9200

full-down:
	docker compose -f docker-compose.full.yml down

# ======================
# CLEAN
# ======================

clean:
	powershell -NoProfile -Command "Get-ChildItem -Recurse -Filter *.pyc | Remove-Item -Force -ErrorAction SilentlyContinue"
	powershell -NoProfile -Command "Get-ChildItem -Recurse -Directory -Filter __pycache__ | Remove-Item -Recurse -Force -ErrorAction SilentlyContinue"
	if exist mlflow.db del /f /q mlflow.db
	if exist mlruns rmdir /s /q mlruns
	if exist .pytest_cache rmdir /s /q .pytest_cache

# ======================
# HELP
# ======================

help:
	@echo Available commands:
	@echo   make install          - install dependencies
	@echo   make train            - train all models
	@echo   make test             - run all 39 tests
	@echo   make api              - start FastAPI on :8000
	@echo   make mlflow           - start MLflow UI on :5000
	@echo   make docker-build     - build Docker image
	@echo   make docker-run       - run Docker container
	@echo   make monitoring-up    - start Elasticsearch + Kibana
	@echo   make monitoring-down  - stop ELK stack
	@echo   make elk-test         - send test metrics to Elasticsearch
	@echo   make elk-status       - show ELK logger status
	@echo   make elk-indices      - list ids-* index document counts
	@echo   make full-up          - start full stack (API+MLflow+ELK)
	@echo   make full-down        - stop full stack