# 📤 Git Push Guide - What to Include

## ✅ Files TO PUSH (Essential Code)

### Core Python Files (12 files)
```
✅ model_pipeline.py          # ML training pipeline
✅ main.py                     # CLI interface
✅ app.py                      # FastAPI backend
✅ attack_classifier.py        # Attack classification
✅ shap_explainer.py          # SHAP explainability
✅ drift_monitor.py           # Drift monitoring
✅ database.py                # Database operations
✅ dashboard.py               # Streamlit dashboard
```

### Test Files (3 files)
```
✅ test_api.py                # API tests
✅ test_pipeline.py           # Pipeline tests
✅ test_attack_classifier.py  # Classifier tests
```

### Configuration Files (5 files)
```
✅ requirements.txt           # Python dependencies
✅ Makefile                   # Build automation
✅ Dockerfile                 # Docker configuration
✅ docker-compose.monitoring.yml
✅ pytest.ini                 # Test configuration
```

### Documentation Files (6 files)
```
✅ README.md                  # Project overview
✅ PROJECT_SUMMARY.md         # Complete summary
✅ IMPLEMENTATION_STATUS.md   # Feature status
✅ DASHBOARD_GUIDE.md         # Dashboard usage
✅ DRIFT_MONITORING_GUIDE.md  # Drift monitoring
✅ FINAL_SUMMARY.md           # Final summary
✅ GIT_PUSH_GUIDE.md          # This file
```

### Data Files (Optional - if small)
```
✅ pi/Data5G/*.csv            # Only if < 10MB each
✅ pi/Data5G/*.arff           # Only if < 10MB each
⚠️  Consider using Git LFS for large files
```

---

## ❌ Files NOT TO PUSH (Generated/Large Files)

### Trained Models (❌ DO NOT PUSH)
```
❌ lightgbm_mMTC.joblib       # ~5-10MB each
❌ lightgbm_URLLC.joblib
❌ lightgbm_eMBB.joblib
❌ lightgbm_TON_IoT.joblib
```
**Why**: Large binary files, can be retrained locally
**Alternative**: Document training command in README

### Databases (❌ DO NOT PUSH)
```
❌ predictions.db             # Generated during runtime
❌ mlflow.db                  # Generated during training
```
**Why**: Generated locally, contains runtime data
**Alternative**: Will be created automatically on first run

### MLflow Artifacts (❌ DO NOT PUSH)
```
❌ mlruns/                    # MLflow experiment tracking
```
**Why**: Large directory with experiment artifacts
**Alternative**: Each user generates their own experiments

### Cache & Temporary Files (❌ DO NOT PUSH)
```
❌ __pycache__/               # Python bytecode
❌ .pytest_cache/             # Pytest cache
❌ *.pyc                      # Compiled Python
❌ .coverage                  # Coverage reports
```
**Why**: Generated automatically, not needed in repo

### IDE & OS Files (❌ DO NOT PUSH)
```
❌ .vscode/                   # VS Code settings
❌ .idea/                     # PyCharm settings
❌ .DS_Store                  # macOS files
❌ Thumbs.db                  # Windows files
```
**Why**: Personal IDE settings, OS-specific

### Environment Files (❌ DO NOT PUSH)
```
❌ .env                       # Environment variables
❌ venv/                      # Virtual environment
❌ env/                       # Virtual environment
```
**Why**: Contains secrets, local configuration

---

## 📋 Pre-Push Checklist

Before pushing to Git, verify:

### 1. Check .gitignore
```bash
cat .gitignore
# Verify it includes all exclusions above
```

### 2. Check what will be pushed
```bash
git status
# Review the list of files
```

### 3. Check file sizes
```bash
# In pi/MLOPS directory
ls -lh *.joblib *.db
# If any file > 10MB, don't push it
```

### 4. Verify no sensitive data
```bash
# Check for API keys, passwords, tokens
grep -r "password\|api_key\|secret" pi/MLOPS/*.py
```

---

## 🚀 Recommended Git Workflow

### Initial Setup
```bash
cd /path/to/project

# Check current status
git status

# Add only necessary files
git add pi/MLOPS/*.py
git add pi/MLOPS/test_*.py
git add pi/MLOPS/*.txt
git add pi/MLOPS/Makefile
git add pi/MLOPS/Dockerfile
git add pi/MLOPS/*.md
git add .gitignore

# Verify what's staged
git status

# Commit
git commit -m "Add complete 6G Smart City IDS MLOps pipeline

- Core ML pipeline with LightGBM
- FastAPI backend with 11 endpoints
- Streamlit dashboard with 6 pages
- SHAP explainability
- Drift monitoring
- 39 tests (100% pass rate)
- Complete documentation"

# Push
git push origin main
```

### Alternative: Add Everything (Let .gitignore handle it)
```bash
# This is safe if .gitignore is properly configured
git add .
git status  # Verify no large files are staged
git commit -m "Add 6G Smart City IDS MLOps pipeline"
git push origin main
```

---

## 📊 Expected Repository Size

After pushing (without models/databases):
- **Code**: ~500KB (Python files)
- **Documentation**: ~200KB (Markdown files)
- **Config**: ~50KB (requirements, Makefile, etc.)
- **Total**: ~750KB - 1MB

**If you include data files**: +50-100MB (depends on dataset size)

---

## 🔍 Verify Before Push

### Check for large files
```bash
# Find files larger than 10MB
find pi/MLOPS -type f -size +10M

# If any found, add to .gitignore
```

### Check for sensitive data
```bash
# Search for potential secrets
grep -r "password\|api_key\|secret\|token" pi/MLOPS/*.py

# If found, remove or use environment variables
```

### Check git status
```bash
git status

# Should NOT see:
# - *.joblib files
# - *.db files
# - mlruns/ directory
# - __pycache__/ directories
```

---

## 📝 README Instructions for Others

Add this to your README.md so others know how to set up:

```markdown
## Setup Instructions

### 1. Clone Repository
\`\`\`bash
git clone <your-repo-url>
cd pi/MLOPS
\`\`\`

### 2. Install Dependencies
\`\`\`bash
pip install -r requirements.txt
\`\`\`

### 3. Train Models (Required - not included in repo)
\`\`\`bash
make train-all
# This will create the .joblib model files
\`\`\`

### 4. Start Services
\`\`\`bash
# Terminal 1: API
make api

# Terminal 2: Dashboard
make dashboard
\`\`\`

### 5. Access
- Dashboard: http://localhost:8501
- API Docs: http://localhost:8000/docs
```

---

## 🎯 Summary

### ✅ DO PUSH (27 files)
- 12 Python source files
- 3 Test files
- 5 Configuration files
- 6 Documentation files
- 1 .gitignore file

### ❌ DON'T PUSH
- Trained models (*.joblib) - 4 files
- Databases (*.db) - 2 files
- MLflow artifacts (mlruns/) - directory
- Cache files (__pycache__/) - directories
- IDE settings (.vscode/, .idea/)
- Virtual environments (venv/, env/)

### 📦 Total Repository Size
- **With code only**: ~1MB
- **With data files**: ~50-100MB (optional)

---

## 🔧 Quick Commands

```bash
# Check what will be pushed
git status

# Check file sizes
du -sh pi/MLOPS/*

# Check .gitignore is working
git check-ignore pi/MLOPS/*.joblib
# Should output the .joblib files (means they're ignored)

# Add all (safe with .gitignore)
git add .

# Commit
git commit -m "Add 6G Smart City IDS MLOps pipeline"

# Push
git push origin main
```

---

## ⚠️ Important Notes

1. **Models are NOT included** - Users must train locally with `make train-all`
2. **Databases are NOT included** - Created automatically on first run
3. **Data files are OPTIONAL** - Consider Git LFS for large datasets
4. **Secrets are EXCLUDED** - Use environment variables for sensitive data

---

## 🎓 Best Practices

1. ✅ Always review `git status` before committing
2. ✅ Keep repository size < 100MB (without Git LFS)
3. ✅ Document setup steps in README
4. ✅ Use .gitignore for generated files
5. ✅ Never commit secrets or credentials
6. ✅ Use Git LFS for files > 10MB
7. ✅ Test clone on another machine to verify setup

---

**Ready to push!** Your repository will be clean and professional. 🚀
