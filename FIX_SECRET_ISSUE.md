# 🔒 Fix: Remove Secret from Git History

## Problem
GitHub detected a GCP API Key in commit `3737452` in file `pi/pi_4data.ipynb:212`

## ✅ Solution: Rewrite Git History

### Option 1: Interactive Rebase (Recommended)

```bash
# 1. Start interactive rebase from before the problematic commit
git rebase -i e216871

# 2. In the editor that opens, change 'pick' to 'edit' for commit 3737452
#    Save and close the editor

# 3. Amend the commit to remove the secret
#    (The secret is already removed in the file)
git add pi/pi_4data.ipynb
git commit --amend --no-edit

# 4. Continue the rebase
git rebase --continue

# 5. Force push (this rewrites history)
git push origin main --force
```

### Option 2: Use BFG Repo-Cleaner (Advanced)

```bash
# 1. Install BFG
# Download from: https://rtyley.github.io/bfg-repo-cleaner/

# 2. Create a file with the secret to remove
echo "YOUR_EXPOSED_API_KEY_HERE" > secrets.txt

# 3. Run BFG to remove the secret
java -jar bfg.jar --replace-text secrets.txt

# 4. Clean up
git reflog expire --expire=now --all
git gc --prune=now --aggressive

# 5. Force push
git push origin main --force
```

### Option 3: Reset and Recommit (Simplest)

```bash
# 1. Reset to before the problematic commit
git reset --soft e216871

# 2. Recommit everything (secret is already removed)
git add .
git commit -m "Add complete 6G Smart City IDS MLOps pipeline

Features:
- LightGBM models for 4 network slices (90%+ accuracy)
- FastAPI backend with 11 REST endpoints
- Streamlit dashboard with 6 interactive pages
- SHAP explainability for trustworthy AI
- Concept drift monitoring with KS test
- 39 tests with 100% pass rate
- Complete documentation

Tech: Python, FastAPI, Streamlit, LightGBM, SHAP, MLflow"

# 3. Force push
git push origin main --force
```

### Option 4: Use GitHub's Allow Link (Not Recommended)

Visit this URL to allow the secret (but this is not secure):
https://github.com/ahmed-karray/Esprit-PI-4DATA-2026-6G-SmartCity-IDS/security/secret-scanning/unblock-secret/3CXrlB9aPH7bPPxEqKtILogZXwz

---

## ⚠️ Important Notes

1. **Force push rewrites history** - Coordinate with team members
2. **Revoke the exposed API key** - It's already public, so revoke it:
   - Go to Google Cloud Console
   - Navigate to APIs & Services → Credentials
   - Delete or regenerate the key

3. **Use environment variables** - The notebook is now fixed to use:
   ```python
   GEMINI_API_KEY = os.getenv('GEMINI_API_KEY', 'YOUR_API_KEY_HERE')
   ```

---

## 🚀 Recommended: Option 3 (Reset and Recommit)

This is the simplest and safest approach. Run these commands:

```bash
# Reset to before problematic commit
git reset --soft e216871

# Recommit everything
git add .
git commit -m "Add complete 6G Smart City IDS MLOps pipeline"

# Force push
git push origin main --force
```

---

## ✅ After Fixing

1. **Revoke the old API key** in Google Cloud Console
2. **Generate a new API key**
3. **Set it as environment variable**:
   ```bash
   export GEMINI_API_KEY='your-new-key-here'
   ```

4. **Add to .gitignore** (already done):
   ```
   .env
   .env.local
   ```

---

## 📝 Prevention

To prevent this in the future:

1. **Never hardcode secrets** in code
2. **Use environment variables** or `.env` files
3. **Add `.env` to .gitignore**
4. **Use git-secrets** tool to scan before commit:
   ```bash
   git secrets --install
   git secrets --register-aws
   ```

---

**Choose Option 3 for the quickest fix!**
