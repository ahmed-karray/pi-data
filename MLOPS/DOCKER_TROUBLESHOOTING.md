# 🐳 Docker Troubleshooting Guide

## ❌ Erreur: "cannot allocate memory"

### Symptômes
```
ERROR: failed to solve: ResourceExhausted: 
process "/bin/sh -c apt-get update..." did not complete successfully: 
cannot allocate memory
```

### Cause
Docker Desktop n'a pas assez de RAM allouée pour le build.

---

## ✅ Solutions

### Solution 1: Augmenter la RAM Docker (Recommandé)

#### Étapes Détaillées:

1. **Ouvrir Docker Desktop**
   - Cliquez sur l'icône Docker 🐳 dans la barre des tâches Windows

2. **Accéder aux Paramètres**
   - Cliquez sur l'icône ⚙️ (Settings) en haut à droite
   - Ou: Menu → Settings

3. **Configurer les Ressources**
   
   **Si vous utilisez WSL2 (recommandé):**
   - Allez dans: **Resources** → **WSL Integration**
   - Créez/modifiez le fichier `.wslconfig` dans `C:\Users\VotreNom\`
   
   ```ini
   [wsl2]
   memory=6GB
   processors=4
   swap=2GB
   ```
   
   - Redémarrez WSL: `wsl --shutdown` dans PowerShell
   - Redémarrez Docker Desktop

   **Si vous utilisez Hyper-V:**
   - Allez dans: **Resources** → **Advanced**
   - **Memory**: Augmentez à **4-6 GB** (minimum 4 GB)
   - **Swap**: Augmentez à **2 GB**
   - **CPUs**: 2-4 cores
   - Cliquez sur **Apply & Restart**

4. **Vérifier les Ressources**
   ```bash
   docker info | grep -i memory
   docker info | grep -i cpus
   ```

#### Recommandations par Taille de Projet:

| Projet | RAM Docker | Swap | CPUs |
|--------|------------|------|------|
| Petit (API simple) | 2 GB | 1 GB | 2 |
| Moyen (MLOps) | 4-6 GB | 2 GB | 2-4 |
| Grand (ML + ELK) | 8+ GB | 4 GB | 4+ |

---

### Solution 2: Utiliser le Dockerfile Allégé

Si vous ne pouvez pas augmenter la RAM, utilisez la version light:

```bash
# Build avec le Dockerfile allégé
docker build -f Dockerfile.light -t 6g_ids_mlops_light .

# Run (API seulement, pas de MLflow)
docker run -d -p 8000:8000 --name 6g_ids_api 6g_ids_mlops_light
```

**Différences**:
- ✅ Utilise moins de RAM (1-2 GB au lieu de 4 GB)
- ✅ Build plus rapide
- ✅ Image plus petite
- ❌ Pas de MLflow inclus (API seulement)
- ❌ Pas de build-essential (pas de compilation)

---

### Solution 3: Build Multi-Stage (Avancé)

Créez un build en plusieurs étapes pour réduire l'image finale:

```dockerfile
# Stage 1: Builder
FROM python:3.11-slim as builder
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir --user -r requirements.txt

# Stage 2: Runtime
FROM python:3.11-slim
WORKDIR /app
COPY --from=builder /root/.local /root/.local
COPY . .
ENV PATH=/root/.local/bin:$PATH
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8000"]
```

---

### Solution 4: Optimiser le Dockerfile Original

Le Dockerfile a été optimisé pour:
- ✅ Installer les dépendances en petits chunks
- ✅ Supprimer `build-essential` (pas nécessaire pour Python pur)
- ✅ Utiliser `--no-cache-dir` pour économiser l'espace
- ✅ Nettoyer les caches apt

---

## 🔍 Diagnostic

### Vérifier la RAM Disponible

**Windows (PowerShell):**
```powershell
# RAM totale système
Get-CimInstance Win32_PhysicalMemory | Measure-Object -Property capacity -Sum

# RAM utilisée
Get-Counter '\Memory\Available MBytes'
```

**Docker:**
```bash
# Info Docker
docker info

# Stats en temps réel
docker stats

# Mémoire allouée à Docker
docker system df
```

### Vérifier l'Espace Disque

```bash
# Espace disque Docker
docker system df

# Nettoyer Docker
docker system prune -a --volumes
```

---

## 🚀 Commandes de Build Optimisées

### Build Standard (Nécessite 4+ GB RAM)
```bash
docker build -t 6g_ids_mlops .
```

### Build Light (Nécessite 2 GB RAM)
```bash
docker build -f Dockerfile.light -t 6g_ids_mlops_light .
```

### Build avec Limite de Mémoire
```bash
docker build --memory=2g --memory-swap=4g -t 6g_ids_mlops .
```

### Build sans Cache (Si problème de cache)
```bash
docker build --no-cache -t 6g_ids_mlops .
```

### Build avec BuildKit (Plus efficace)
```bash
DOCKER_BUILDKIT=1 docker build -t 6g_ids_mlops .
```

---

## 📊 Comparaison des Versions

| Version | RAM Build | RAM Run | Taille Image | Services | Build Time |
|---------|-----------|---------|--------------|----------|------------|
| **Standard** | 4-6 GB | 2-3 GB | ~1.2 GB | API + MLflow | 10-15 min |
| **Light** | 2 GB | 1 GB | ~800 MB | API only | 5-8 min |
| **Multi-Stage** | 3 GB | 1.5 GB | ~900 MB | API + MLflow | 8-12 min |

---

## 🛠️ Makefile Commands

Ajoutez ces commandes à votre Makefile:

```makefile
# Build version light
docker-build-light:
	docker build -f Dockerfile.light -t $(IMAGE_NAME)_light:$(TAG) .

# Build avec limite mémoire
docker-build-limited:
	docker build --memory=2g --memory-swap=4g -t $(IMAGE_NAME):$(TAG) .

# Build sans cache
docker-build-clean:
	docker build --no-cache -t $(IMAGE_NAME):$(TAG) .

# Nettoyer Docker
docker-clean:
	docker system prune -a --volumes -f
```

---

## ⚠️ Erreurs Courantes

### 1. "Killed" pendant le build
**Cause**: Manque de RAM  
**Solution**: Augmenter la RAM Docker ou utiliser Dockerfile.light

### 2. "no space left on device"
**Cause**: Disque plein  
**Solution**: 
```bash
docker system prune -a --volumes
```

### 3. "failed to solve with frontend dockerfile.v0"
**Cause**: Syntaxe Dockerfile incorrecte  
**Solution**: Vérifier la syntaxe du Dockerfile

### 4. Build très lent
**Cause**: Pas de cache, réseau lent  
**Solution**: 
- Utiliser BuildKit: `DOCKER_BUILDKIT=1`
- Vérifier la connexion internet
- Utiliser un miroir Docker local

---

## 📝 Checklist de Dépannage

Avant de build, vérifiez:

- [ ] Docker Desktop est démarré
- [ ] RAM allouée ≥ 4 GB (ou 2 GB pour light)
- [ ] Espace disque ≥ 10 GB disponible
- [ ] Connexion internet stable
- [ ] Pas d'autres builds Docker en cours
- [ ] Fichiers `.dockerignore` configuré
- [ ] `requirements.txt` existe et est valide

---

## 🎯 Recommandations

### Pour Développement Local
```bash
# Utilisez la version light
make docker-build-light
make docker-run IMAGE_NAME=6g_ids_mlops_light
```

### Pour Production
```bash
# Utilisez la version standard
make docker-build
make docker-push
```

### Pour CI/CD
```bash
# Utilisez BuildKit avec cache
DOCKER_BUILDKIT=1 docker build \
  --cache-from=type=registry,ref=user/image:buildcache \
  --cache-to=type=registry,ref=user/image:buildcache \
  -t user/image:latest .
```

---

## 📞 Support

Si le problème persiste:

1. Vérifiez les logs Docker Desktop
2. Redémarrez Docker Desktop
3. Redémarrez Windows
4. Vérifiez les mises à jour Docker Desktop
5. Consultez: https://docs.docker.com/desktop/troubleshoot/

---

## 🔗 Ressources

- [Docker Desktop Settings](https://docs.docker.com/desktop/settings/)
- [Docker Build Best Practices](https://docs.docker.com/develop/dev-best-practices/)
- [Dockerfile Reference](https://docs.docker.com/engine/reference/builder/)
- [BuildKit Documentation](https://docs.docker.com/build/buildkit/)

---

**Dernière mise à jour**: 2026-04-22  
**Version**: 1.0
