# 🧪 Exemples Synthétiques TON_IoT - BENIGN & MALICIOUS

**Features:** duration, src_bytes, dst_bytes, src_pkts, dst_pkts, conn_state, service, proto

---

## ✅ EXEMPLES BENIGN (Trafic IoT Normal)

### Exemple B1 - Requête DNS Normale
```
duration: 0.025000
src_bytes: 65
dst_bytes: 120
src_pkts: 1
dst_pkts: 1
conn_state: SF
service: dns
proto: udp
```
**Caractéristiques:** Requête DNS standard, réponse reçue, équilibré

---

### Exemple B2 - Session SSL Normale
```
duration: 2.300000
src_bytes: 850
dst_bytes: 1500
src_pkts: 8
dst_pkts: 7
conn_state: SF
service: ssl
proto: tcp
```
**Caractéristiques:** Session SSL sécurisée, échange normal

---

### Exemple B3 - Connexion HTTP Normale (Équilibrée)
```
duration: 0.054183
src_bytes: 800
dst_bytes: 1200
src_pkts: 4
dst_pkts: 3
conn_state: SF
service: http
proto: tcp
```
**Caractéristiques:** HTTP normal, ratio dst/src < 2.5 (pas d'injection)

---

### Exemple B4 - Transfert FTP Normal
```
duration: 15.500000
src_bytes: 12000
dst_bytes: 45000
src_pkts: 25
dst_pkts: 35
conn_state: SF
service: ftp
proto: tcp
```
**Caractéristiques:** Transfert FTP avec beaucoup de données, connexion réussie

---

### Exemple B5 - Trafic TCP Normal
```
duration: 0.150000
src_bytes: 520
dst_bytes: 640
src_pkts: 5
dst_pkts: 4
conn_state: SF
service: -
proto: tcp
```
**Caractéristiques:** Connexion TCP normale, échange bidirectionnel

---

## 🚨 EXEMPLES MALICIOUS (Attaques IoT)

### Exemple A1 - DDoS Attack
```
duration: 1.500000
src_bytes: 52000
dst_bytes: 1200
src_pkts: 1200
dst_pkts: 15
conn_state: S0
service: -
proto: tcp
```
**Caractéristiques d'attaque:**
- src_pkts > 1000 AND duration < 2.0 → DDoS
- Énorme nombre de paquets source en peu de temps
- Pattern: attaque DDoS volumétrique

---

### Exemple A2 - DoS Attack
```
duration: 3.800000
src_bytes: 35000
dst_bytes: 800
src_pkts: 450
dst_pkts: 10
conn_state: S0
service: -
proto: tcp
```
**Caractéristiques d'attaque:**
- src_pkts > 200 AND duration < 5.0 → DoS
- Beaucoup de paquets source, peu de réponses
- Pattern: déni de service

---

### Exemple A3 - Scanning Attack
```
duration: 0.000150
src_bytes: 0
dst_bytes: 0
src_pkts: 1
dst_pkts: 1
conn_state: REJ
service: -
proto: tcp
```
**Caractéristiques d'attaque:**
- conn_state = REJ AND src_pkts < 10 → Scanning
- Connexion rejetée, tentative de scan
- Pattern: scan de ports

---

### Exemple A4 - Password Attack
```
duration: 0.850000
src_bytes: 250
dst_bytes: 180
src_pkts: 5
dst_pkts: 4
conn_state: SF
service: ssh
proto: tcp
```
**Caractéristiques d'attaque:**
- service = ssh AND src_pkts < 20 → Password
- Tentatives de connexion SSH répétées
- Pattern: attaque par force brute

---

### Exemple A5 - Backdoor Attack
```
duration: 290.371539
src_bytes: 15000
dst_bytes: 2592
src_pkts: 108
dst_pkts: 31
conn_state: OTH
service: -
proto: tcp
```
**Caractéristiques d'attaque:**
- duration > 60 AND src_bytes < 150000 AND conn_state = OTH → Backdoor
- Connexion très longue avec données modérées
- Pattern: backdoor persistant

---

### Exemple A6 - Ransomware Attack
```
duration: 45.000000
src_bytes: 250000
dst_bytes: 5000
src_pkts: 500
dst_pkts: 50
conn_state: SF
service: -
proto: tcp
```
**Caractéristiques d'attaque:**
- duration > 10 AND src_bytes > 100000 → Ransomware
- Transfert massif de données sur longue durée
- Pattern: chiffrement/exfiltration de fichiers

---

### Exemple A7 - Injection Attack
```
duration: 0.250000
src_bytes: 650
dst_bytes: 2500
src_pkts: 8
dst_pkts: 6
conn_state: SF
service: http
proto: tcp
```
**Caractéristiques d'attaque:**
- service = http AND dst_bytes > src_bytes * 2.5 → Injection
- Réponse anormalement grande (injection SQL)
- Pattern: injection de code

---

### Exemple A8 - XSS Attack
```
duration: 0.180000
src_bytes: 650
dst_bytes: 1100
src_pkts: 6
dst_pkts: 5
conn_state: SF
service: http
proto: tcp
```
**Caractéristiques d'attaque:**
- service = http (not injection pattern) → XSS
- Requête HTTP avec script malveillant
- Pattern: cross-site scripting

---

### Exemple A9 - MITM Attack
```
duration: 0.000050
src_bytes: 52
dst_bytes: 40
src_pkts: 1
dst_pkts: 1
conn_state: SF
service: -
proto: tcp
```
**Caractéristiques d'attaque:**
- conn_state = SF AND src_bytes < 100 AND dst_bytes < 100 AND duration < 0.001 → MITM
- Connexion ultra-courte avec données minimales
- Pattern: interception man-in-the-middle

---

## 📊 Patterns de Détection

### BENIGN (Normal IoT)
- ✅ conn_state: SF (connexion réussie)
- ✅ src_pkts: 1-50 (nombre raisonnable)
- ✅ duration: 0-15s (variable)
- ✅ Échange bidirectionnel équilibré

### MALICIOUS (Attaques IoT)
- 🚨 **DDoS**: src_pkts > 1000 AND duration < 2s
- 🚨 **DoS**: src_pkts > 200 AND duration < 5s
- 🚨 **Scanning**: conn_state = REJ/RSTO/RSTOS0 AND src_pkts < 10
- 🚨 **Password**: service = ssh/ftp AND src_pkts < 20
- 🚨 **Backdoor**: duration > 60 AND src_bytes < 150K AND conn_state = SF/OTH
- 🚨 **Ransomware**: src_bytes > 100K AND duration > 10
- 🚨 **Injection**: service = http AND dst_bytes > src_bytes * 2.5
- 🚨 **XSS**: service = http (autres cas)
- 🚨 **MITM**: proto ≠ tcp/udp OR (très petite connexion < 0.001s)

---

## 🎯 Comment Tester

### Test Individuel
1. Lancez `streamlit run streamlit_app/app.py`
2. Sélectionnez **TON_IoT**
3. Copiez un exemple (B1-B5 ou A1-A9)
4. Cliquez sur **"🔍 Run Detection"**

### Résultats Attendus
- **B1-B5:** Benign
- **A1:** DDoS
- **A2:** DoS
- **A3:** Scanning
- **A4:** Password
- **A5:** Backdoor
- **A6:** Ransomware
- **A7:** Injection
- **A8:** XSS
- **A9:** MITM

---

## 📝 Notes Importantes

1. **TON_IoT = Telemetry dataset of IoT**
2. **9 types d'attaques** - Le plus complexe des datasets
3. **Patterns variés** - Chaque attaque a des caractéristiques uniques
4. **conn_state important** - SF (success), REJ (rejected), S0 (no response)

---

## 🔬 Analyse du Dataset Réel

**Distribution:**
- Benign: 49,983 (23.7%)
- Malicious: 160,986 (76.3%)

**Attack types (équilibrés):**
- DDoS, DoS, Scanning, Ransomware, Injection, XSS: ~20,000 each
- Backdoor, Password: ~20,000 each
- MITM: ~1,000

**Caractéristiques:**
- Median duration: 0.000169s (très court)
- Median src_pkts: 1 (minimal)
- conn_state: S0 (51,937), SF (50,210), REJ (44,852)
