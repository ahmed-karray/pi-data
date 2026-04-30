# =============================================================================
# Makefile - 6G Smart City IDS MLOps Pipeline
# Windows cmd-friendly GNU Make targets
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
DOCKER_USER ?= your_dockerhub_username
TAG         ?= latest
MLFLOW_PORT := 5000
API_PORT    := 8000
ES_PORT     := 9200
KIBANA_PORT := 5601

.PHONY: all install venv list-data prepare train train-all evaluate api api-bg \
        mlflow mlflow-bg dashboard lint format format-check security test \
        docker-build docker-build-light docker-build-limited docker-build-clean \
        docker-run docker-push docker-stop docker-clean docker-images \
        monitoring-up monitoring-down monitoring-status \
        stack-up stack-down stack-restart stack-logs stack-ps \
        clean help

all: install lint test train-all
	@echo Full pipeline complete.

venv:
	$(PYTHON) -m venv $(VENV)
	@echo $(VENV_ACTIVATE_MSG)

install:
	$(PIP) install -r requirements.txt
	@echo Dependencies installed.

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

api:
	$(PYTHON) -m uvicorn app:app --reload --host 0.0.0.0 --port $(API_PORT)

api-bg:
	start "6G IDS API" /B $(PYTHON) -m uvicorn app:app --host 0.0.0.0 --port $(API_PORT)

mlflow:
	mlflow server --backend-store-uri sqlite:///mlflow.db --default-artifact-root ./mlruns --host 0.0.0.0 --port $(MLFLOW_PORT)

mlflow-bg:
	start "MLflow" /B mlflow server --backend-store-uri sqlite:///mlflow.db --default-artifact-root ./mlruns --host 0.0.0.0 --port $(MLFLOW_PORT)
	@echo MLflow UI: http://localhost:$(MLFLOW_PORT)

lint:
	$(PYTHON) -m flake8 . --jobs=1 --max-line-length=100 --exclude=$(VENV),__pycache__,.git

format:
	$(PYTHON) -m black . --line-length 100

format-check:
	$(PYTHON) -m black . --line-length 100 --check

security:
	$(PYTHON) -m bandit -r . --exclude $(VENV) -ll

test:
	$(PYTHON) -m pytest test_api.py test_pipeline.py -v --tb=short

docker-build:
	docker build -t $(IMAGE_NAME):$(TAG) .
	@echo Image built: $(IMAGE_NAME):$(TAG)

docker-build-light:
	docker build -f Dockerfile.light -t $(IMAGE_NAME)_light:$(TAG) .
	@echo Lightweight image built: $(IMAGE_NAME)_light:$(TAG)

docker-build-limited:
	docker build --memory=2g --memory-swap=4g -t $(IMAGE_NAME):$(TAG) .
	@echo Image built with memory limits: $(IMAGE_NAME):$(TAG)

docker-build-clean:
	docker build --no-cache -t $(IMAGE_NAME):$(TAG) .
	@echo Image built without cache: $(IMAGE_NAME):$(TAG)

docker-run:
	docker run -d --name 6g_ids_container -p $(API_PORT):$(API_PORT) -p $(MLFLOW_PORT):$(MLFLOW_PORT) -e MLFLOW_TRACKING_URI=http://localhost:$(MLFLOW_PORT) $(IMAGE_NAME):$(TAG)
	@echo Container running: http://localhost:$(API_PORT)/docs

docker-stop:
	-docker stop 6g_ids_container
	-docker rm 6g_ids_container

docker-push:
	docker tag $(IMAGE_NAME):$(TAG) $(DOCKER_USER)/$(IMAGE_NAME):$(TAG)
	docker push $(DOCKER_USER)/$(IMAGE_NAME):$(TAG)
	@echo Image pushed: $(DOCKER_USER)/$(IMAGE_NAME):$(TAG)

docker-clean:
	docker system prune -a --volumes -f
	@echo Docker system cleaned

docker-images:
	docker images

monitoring-up:
	docker compose -f docker-compose.monitoring.yml up -d
	@echo Elasticsearch: http://localhost:$(ES_PORT)
	@echo Kibana: http://localhost:$(KIBANA_PORT)

monitoring-down:
	docker compose -f docker-compose.monitoring.yml down

monitoring-status:
	$(PYTHON) -c "import json, urllib.request; print(json.dumps(json.load(urllib.request.urlopen('http://localhost:$(ES_PORT)/_cluster/health')), indent=2))"

stack-up:
	docker compose up -d
	@echo MLflow: http://localhost:5000
	@echo API: http://localhost:8000
	@echo Frontend: http://localhost:80
	@echo Elasticsearch: http://localhost:9200
	@echo Kibana: http://localhost:5601

stack-down:
	docker compose down

stack-restart:
	docker compose restart

stack-logs:
	docker compose logs -f

stack-ps:
	docker compose ps

clean:
	powershell -NoProfile -Command "Get-ChildItem -Recurse -Filter *.pyc | Remove-Item -Force -ErrorAction SilentlyContinue"
	powershell -NoProfile -Command "Get-ChildItem -Recurse -Directory -Filter __pycache__ | Remove-Item -Recurse -Force -ErrorAction SilentlyContinue"
	if exist mlflow.db del /f /q mlflow.db
	if exist mlruns rmdir /s /q mlruns
	if exist .pytest_cache rmdir /s /q .pytest_cache

help:
	@echo Available targets:
	@echo   make install
	@echo   make list-data
	@echo   make prepare DATASET=eMBB
	@echo   make train DATASET=eMBB
	@echo   make evaluate DATASET=eMBB
	@echo   make train-all
	@echo   make lint
	@echo   make test
	@echo   make api
	@echo   make dashboard
	@echo   make mlflow
	@echo   make docker-build IMAGE_NAME=my_image
	@echo   make stack-up          # Lancer tous les services
	@echo   make stack-down        # Arrêter tous les services
	@echo   make stack-logs        # Voir les logs
