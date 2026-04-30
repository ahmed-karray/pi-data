# 🚀 Guide de Déploiement - 6G Smart City IDS

## 📋 Checklist Pré-Déploiement

### ✅ Avant la Séance de Validation

- [ ] Code pushé sur GitHub
- [ ] Secrets GitHub configurés
- [ ] MLflow conteneur lancé
- [ ] ELK conteneur lancé
- [ ] Datasets disponibles dans `pi/Data5G/`
- [ ] Modèles entraînés (`.joblib` files)

---

## 🔧 Configuration Initiale

### 1. Configurer les Secrets GitHub

**Aller sur**: GitHub → Settings → Secrets and variables → Actions

**Ajouter**:
```
DOCKER_USERNAME=votre_username_dockerhub
DOCKER_PASSWORD=votre_password_dockerhub
```

### 2. Vérifier les Fichiers

```bash
# Structure requise
.
├── .github/workflows/ci.yml          # Pipeline CI/CD
├── docker-compose.yml                # Orchestration complète
├── pi/
│   ├── MLOPS/
│   │   ├── Dockerfile                # Backend standard
│   │   ├── Dockerfile.light          # Backend allégé
│   │   ├── *.py                      # Code Python
│   │   ├── requirements.txt          # Dépendances
│   │   └── Makefile                  # Commandes
│   ├── app_web/
│   │   ├── Dockerfile                # Frontend
│   │   ├── nginx.conf                # Config Nginx
│   │   └── src/                      # Code React
│   └── Data5G/
│       ├── mMTC.csv
│       ├── URLLC.csv
│       ├── eMBB.csv
│       └── train_test_network.csv
```

---

## 📝 Étape 1: Modification Code + CI Automatique

### Objectif
Démontrer que toute modification de code déclenche automatiquement:
- Analyse de code (lint)
- Formatage (black)
- Sécurité (bandit)
- Tests unitaires
- Entraînement des modèles

### Procédure

#### 1.1 Faire une Modification

```bash
# Exemple: Modifier un fichier Python
cd pi/MLOPS
echo "# Updated on $(date)" >> app.py

# Ou modifier le Makefile
echo "# CI/CD test" >> Makefile
```

#### 1.2 Commit et Push

```bash
git add .
git commit -m "test: Trigger CI/CD pipeline"
git push origin main
```

#### 1.3 Vérifier l'Exécution

1. **Aller sur GitHub** → Actions tab
2. **Observer le pipeline** en cours d'exécution
3. **Vérifier les étapes**:
   - ✅ Quality Check (lint, format, security)
   - ✅ Tests (26 tests)
   - ✅ Model Training (4 modèles)
   - ✅ Docker Build (backend + frontend)

#### 1.4 Résultats Attendus

```
✅ Quality Check: passed
✅ Tests: 26/26 passed
✅ Model Training: 4 models trained
   - mMTC: 93.07% accuracy
   - URLLC: 75.22% accuracy
   - eMBB: 94.83% accuracy
   - TON_IoT: 99.65% accuracy
✅ Docker Build: 2 images created
```

---

## 🐳 Étape 2: Pipeline CD Manuelle

### Objectif
Lancer manuellement le déploiement complet:
- Créer images Docker (back + front)
- Push vers Docker Hub
- Analyser les résultats MLflow
- Lancer les conteneurs

### Procédure

#### 2.1 Lancer MLflow et ELK

```bash
# Terminal 1: MLflow
cd pi/MLOPS
make mlflow

# Terminal 2: ELK Stack
make monitoring-up
```

**Vérifier**:
- MLflow: http://localhost:5000
- Elasticsearch: http://localhost:9200
- Kibana: http://localhost:5601

#### 2.2 Build Images Docker

```bash
# Option A: Build séparément
cd pi/MLOPS
make docker-build-light  # Backend

cd ../app_web
docker build -t iotinel-web .  # Frontend

# Option B: Build avec docker-compose
cd ../..
docker-compose build
```

#### 2.3 Push vers Docker Hub

```bash
# Backend
docker tag 6g_ids_mlops_light:latest votre_username/6g-ids-api:latest
docker push votre_username/6g-ids-api:latest

# Frontend
docker tag iotinel-web:latest votre_username/iotinel-web:latest
docker push votre_username/iotinel-web:latest
```

#### 2.4 Lancer les Conteneurs

```bash
# Option A: Lancer avec docker-compose (RECOMMANDÉ)
docker-compose up -d

# Option B: Lancer séparément
docker run -d -p 8000:8000 --name api votre_username/6g-ids-api:latest
docker run -d -p 80:80 --name frontend votre_username/iotinel-web:latest
```

#### 2.5 Vérifier les Services

```bash
# Vérifier les conteneurs
docker ps

# Vérifier les logs
docker-compose logs -f

# Tester l'API
curl http://localhost:8000/

# Tester le Frontend
curl http://localhost/
```

---

## ✅ Étape 3: Vérification des Résultats

### 3.1 Vérifier Docker Hub

1. **Aller sur**: https://hub.docker.com
2. **Se connecter** avec votre compte
3. **Vérifier les images**:
   - `votre_username/6g-ids-api:latest`
   - `votre_username/iotinel-web:latest`

**Capture d'écran attendue**:
```
Repository                    Tags        Size      Last Updated
6g-ids-api                   latest      800 MB    2 minutes ago
iotinel-web                  latest      50 MB     2 minutes ago
```

### 3.2 Vérifier MLflow

1. **Ouvrir**: http://localhost:5000
2. **Vérifier l'expérience**: "6G_IDS_LightGBM"
3. **Vérifier les runs**:
   - 4 runs (un par dataset)
   - Paramètres enregistrés
   - Métriques enregistrées
   - Modèles sauvegardés

**Métriques attendues**:
```
Run Name          | Accuracy | F1 Score | ROC-AUC
------------------|----------|----------|--------
LightGBM_mMTC     | 93.07%   | 93.04%   | 98.18%
LightGBM_URLLC    | 75.22%   | 70.84%   | 83.60%
LightGBM_eMBB     | 94.83%   | 94.83%   | 99.26%
LightGBM_TON_IoT  | 99.65%   | 99.51%   | 99.98%
```

### 3.3 Tester l'Interface Front

1. **Ouvrir**: http://localhost/ (ou http://localhost:80)
2. **Naviguer** vers "Live Detection"
3. **Faire une prédiction**:
   - Sélectionner dataset: mMTC
   - Entrer des features
   - Cliquer "Predict"
4. **Vérifier l'accuracy** affichée

**Test de prédiction**:
```json
{
  "dataset": "mMTC",
  "features": {
    "Rate": 200,
    "TotPkts": 500,
    "Loss": 10,
    "TcpRtt": 0.05
  }
}
```

**Résultat attendu**:
```json
{
  "prediction": "Malicious",
  "attack_type": "DDoS Attack",
  "severity": "Critical",
  "confidence": 0.95,
  "accuracy": "93.07%"
}
```

### 3.4 Vérifier ELK Monitoring

1. **Ouvrir Kibana**: http://localhost:5601
2. **Créer un Index Pattern**:
   - Management → Index Patterns
   - Pattern: `predictions-*`
   - Time field: `@timestamp`
3. **Créer un Dashboard**:
   - Dashboard → Create new
   - Ajouter visualisations:
     - Métriques machine (CPU, RAM)
     - Métriques modèle (accuracy, F1)
     - Timeline des prédictions
     - Distribution des attaques

**Métriques à afficher**:
```
- CPU Usage: 45%
- RAM Usage: 2.1 GB / 4 GB
- Model Accuracy: 93.07%
- Predictions/min: 12
- Attack Types: DDoS (45%), Flooding (30%), Scanning (25%)
```

---

## 🌟 Étape 4: Excellence

### Points d'Excellence Implémentés

#### 1. SHAP Explainability ✅

**Démonstration**:
```bash
curl -X POST "http://localhost:8000/explain" \
  -H "Content-Type: application/json" \
  -d '{
    "dataset": "mMTC",
    "features": {
      "Rate": 200,
      "TotPkts": 500,
      "Loss": 10,
      "TcpRtt": 0.05
    }
  }'
```

**Résultat**: Explication SHAP avec feature importance

#### 2. Drift Detection ✅

**Démonstration**:
```bash
curl "http://localhost:8000/drift/check?dataset=mMTC"
```

**Résultat**: Détection de drift avec KS test

#### 3. Dashboard Streamlit ✅

**Démonstration**:
```bash
cd pi/MLOPS
streamlit run dashboard.py --server.port 8501
```

**Accès**: http://localhost:8501

#### 4. Attack Classification ✅

**Démonstration**: 13 types d'attaques classifiés automatiquement

#### 5. Documentation Complète ✅

**Fichiers**:
- README.md
- MLOPS_PRACTICES_AUDIT.md
- GUIDE_MLOPS_FR.md
- MLOPS_DASHBOARD.md
- VALIDATION_GRILLE.md
- DEPLOYMENT_GUIDE.md (ce fichier)
- DOCKER_TROUBLESHOOTING.md

---

## 🎯 Commandes Rapides

### Démarrage Complet

```bash
# 1. Lancer tous les services
docker-compose up -d

# 2. Vérifier le statut
docker-compose ps

# 3. Voir les logs
docker-compose logs -f
```

### Arrêt Complet

```bash
# Arrêter tous les services
docker-compose down

# Arrêter et supprimer les volumes
docker-compose down -v
```

### Redémarrage

```bash
# Redémarrer un service
docker-compose restart api

# Redémarrer tous les services
docker-compose restart
```

### Debugging

```bash
# Logs d'un service
docker-compose logs -f api

# Entrer dans un conteneur
docker-compose exec api bash

# Vérifier les ressources
docker stats
```

---

## 📊 Checklist de Validation

### Avant la Démonstration

- [ ] Code sur GitHub
- [ ] Secrets configurés
- [ ] MLflow lancé
- [ ] ELK lancé
- [ ] Datasets disponibles
- [ ] Modèles entraînés

### Pendant la Démonstration

#### Étape 1: CI Automatique
- [ ] Modification code effectuée
- [ ] Push vers GitHub
- [ ] Pipeline CI déclenché
- [ ] Quality check passé
- [ ] Tests passés (26/26)
- [ ] Modèles entraînés (4/4)

#### Étape 2: CD Manuelle
- [ ] Images Docker créées (2)
- [ ] Images pushées sur Docker Hub
- [ ] MLflow mis à jour
- [ ] Conteneurs lancés (5)

#### Étape 3: Vérification
- [ ] Docker Hub: 2 images visibles
- [ ] MLflow: 4 expériences enregistrées
- [ ] Frontend: Prédiction fonctionnelle
- [ ] Kibana: Métriques affichées

#### Étape 4: Excellence
- [ ] SHAP explainability démontré
- [ ] Drift detection démontré
- [ ] Dashboard Streamlit démontré
- [ ] Attack classification démontré
- [ ] Documentation complète présentée

---

## 🚨 Troubleshooting

### Problème: Pipeline CI ne se déclenche pas

**Solution**:
1. Vérifier que le fichier `.github/workflows/ci.yml` existe
2. Vérifier les secrets GitHub
3. Vérifier les permissions du repository

### Problème: Docker build échoue (mémoire)

**Solution**:
```bash
# Utiliser la version light
docker build -f Dockerfile.light -t api .

# Ou augmenter la RAM Docker
# Settings → Resources → Memory: 4-6 GB
```

### Problème: MLflow ne démarre pas

**Solution**:
```bash
# Vérifier le port
lsof -i :5000

# Redémarrer MLflow
docker-compose restart mlflow
```

### Problème: Frontend ne charge pas

**Solution**:
```bash
# Vérifier les logs
docker-compose logs frontend

# Rebuild
docker-compose build frontend
docker-compose up -d frontend
```

---

## 📞 Support

### Ressources

- **Documentation**: `pi/MLOPS/*.md`
- **API Docs**: http://localhost:8000/docs
- **MLflow**: http://localhost:5000
- **Kibana**: http://localhost:5601

### Commandes Utiles

```bash
# Statut des services
docker-compose ps

# Logs en temps réel
docker-compose logs -f

# Nettoyer Docker
docker system prune -a

# Vérifier les ressources
docker stats
```

---

## 🏆 Score Attendu

Avec ce déploiement complet:

| Critère | Points | Status |
|---------|--------|--------|
| Modularisation | 1/1 | ✅ |
| CI/CD | 4/4 | ✅ |
| Gestion Versions | 1/1 | ✅ |
| Docker | 3.5/3.5 | ✅ |
| MLflow | 1/1 | ✅ |
| Monitoring | 1.5/1.5 | ✅ |
| Excellence | 3/3 | ✅ |
| **TOTAL** | **20/20** | **✅** |

---

**Bonne chance pour votre validation! 🚀**

**Date**: 2026-04-22  
**Version**: 1.0  
**Status**: Production-Ready
