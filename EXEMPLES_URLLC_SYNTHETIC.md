# 🧪 Exemples Synthétiques URLLC - BENIGN & MALICIOUS

**Features:** Dur, TotPkts, TotBytes, SrcBytes, pLoss, TcpRtt, SynAck, Load

---

## ✅ EXEMPLES BENIGN (Trafic Ultra-Faible Latence Normal)

### Exemple B1 - Paquet Unique Ultra-Rapide
```
Dur: 0.000289
TotPkts: 2
TotBytes: 124
SrcBytes: 64
pLoss: 0.000000
TcpRtt: 0.000000
SynAck: 0.000000
Load: 0.000000
```
**Caractéristiques:** Communication ultra-rapide, latence nulle, normal pour URLLC

---

### Exemple B2 - Transmission Courte Normale
```
Dur: 2.560000
TotPkts: 2
TotBytes: 84
SrcBytes: 84
pLoss: 0.000000
TcpRtt: 0.000000
SynAck: 0.000000
Load: 131.237137
```
**Caractéristiques:** Durée modérée, peu de paquets, latence nulle

---

### Exemple B3 - Burst Rapide Normal
```
Dur: 0.046000
TotPkts: 6
TotBytes: 730
SrcBytes: 530
pLoss: 0.000000
TcpRtt: 0.000000
SynAck: 0.000000
Load: 84843.742190
```
**Caractéristiques:** Burst court avec plusieurs paquets, latence nulle

---

### Exemple B4 - Paquet Isolé
```
Dur: 0.000000
TotPkts: 1
TotBytes: 74
SrcBytes: 74
pLoss: 0.000000
TcpRtt: 0.000000
SynAck: 0.000000
Load: 0.000000
```
**Caractéristiques:** Paquet unique instantané, typique URLLC

---

### Exemple B5 - Communication Bidirectionnelle
```
Dur: 2.579000
TotPkts: 2
TotBytes: 84
SrcBytes: 84
pLoss: 0.000000
TcpRtt: 0.000000
SynAck: 0.000000
Load: 130.280991
```
**Caractéristiques:** Échange court, latence nulle

---

## 🚨 EXEMPLES MALICIOUS (Attaques URLLC)

### Exemple A1 - UDP DDoS Flood
```
Dur: 0.000000
TotPkts: 1
TotBytes: 42
SrcBytes: 42
pLoss: 0.000000
TcpRtt: 0.000000
SynAck: 0.000000
Load: 0.000000
```
**Caractéristiques d'attaque:**
- Dur = 0 AND TotPkts = 1 → UDP DDoS Flood
- Paquet unique instantané suspect
- Pattern: flood UDP minimal

---

### Exemple A2 - RST Injection (High RTT)
```
Dur: 0.075828
TotPkts: 2
TotBytes: 132
SrcBytes: 66
pLoss: 0.000000
TcpRtt: 0.065000
SynAck: 0.001823
Load: 0.000000
```
**Caractéristiques d'attaque:**
- TcpRtt > 0.05 AND TotPkts < 5 → RST Injection
- Latence élevée (65ms) anormale pour URLLC
- Pattern: injection de paquets RST

---

### Exemple A3 - SLA Violation / DoS (Very High RTT)
```
Dur: 2.582475
TotPkts: 2
TotBytes: 84
SrcBytes: 84
pLoss: 0.000000
TcpRtt: 0.120000
SynAck: 0.000000
Load: 130.107742
```
**Caractéristiques d'attaque:**
- TcpRtt > 0.1 → SLA Violation / DoS
- Latence catastrophique (120ms) pour URLLC
- Pattern: violation des SLA de latence

---

### Exemple A4 - Reconnaissance
```
Dur: 4.883080
TotPkts: 14
TotBytes: 1426
SrcBytes: 479
pLoss: 0.000000
TcpRtt: 0.020011
SynAck: 0.001661
Load: 2003.653442
```
**Caractéristiques d'attaque:**
- Ne correspond pas aux autres patterns → Reconnaissance
- Durée longue avec activité modérée
- Pattern: scan ou reconnaissance

---

### Exemple A5 - UDP DDoS Flood (Variant)
```
Dur: 0.000000
TotPkts: 1
TotBytes: 66
SrcBytes: 66
pLoss: 0.000000
TcpRtt: 0.022903
SynAck: 0.001516
Load: 0.000000
```
**Caractéristiques d'attaque:**
- Dur = 0 AND TotPkts = 1 → UDP DDoS Flood
- Paquet unique instantané
- Pattern: flood UDP

---

### Exemple A6 - RST Injection (Moderate RTT)
```
Dur: 2.586853
TotPkts: 2
TotBytes: 84
SrcBytes: 84
pLoss: 0.000000
TcpRtt: 0.055000
SynAck: 0.000000
Load: 129.887543
```
**Caractéristiques d'attaque:**
- TcpRtt > 0.05 AND TotPkts < 5 → RST Injection
- Latence élevée (55ms)
- Pattern: injection RST

---

### Exemple A7 - SLA Violation (Extreme RTT)
```
Dur: 2.570030
TotPkts: 3
TotBytes: 198
SrcBytes: 132
pLoss: 0.000000
TcpRtt: 0.146207
SynAck: 0.001846
Load: 205.445068
```
**Caractéristiques d'attaque:**
- TcpRtt > 0.1 → SLA Violation / DoS
- Latence extrême (146ms)
- Pattern: DoS par dégradation de latence

---

### Exemple A8 - Reconnaissance (Long Duration)
```
Dur: 4.740546
TotPkts: 11
TotBytes: 1737
SrcBytes: 377
pLoss: 15.384615
TcpRtt: 0.013973
SynAck: 0.001581
Load: 2423.349365
```
**Caractéristiques d'attaque:**
- Durée longue, activité modérée → Reconnaissance
- Pertes de paquets (15.4%)
- Pattern: scan réseau

---

## 📊 Patterns de Détection

### BENIGN (Normal URLLC)
- ✅ TcpRtt: 0.000-0.003s (LATENCE ULTRA-FAIBLE)
- ✅ Dur: 0-2.6s (variable)
- ✅ TotPkts: 1-6 (peu de paquets)
- ✅ TotBytes: 42-730 (petites tailles)
- ✅ pLoss: 0% (aucune perte)

### MALICIOUS (Attaque URLLC)
- 🚨 **UDP DDoS Flood**: Dur = 0 AND TotPkts = 1
- 🚨 **RST Injection**: TcpRtt > 0.05s AND TotPkts < 5
- 🚨 **SLA Violation**: TcpRtt > 0.1s (latence inacceptable)
- 🚨 **Reconnaissance**: Autres patterns (durée longue, activité modérée)

### 🔑 Clé de Détection
Le modèle détecte les attaques par:
- **Latence élevée (TcpRtt > 0.05s)** = Violation URLLC
- **Paquet unique instantané (Dur=0, TotPkts=1)** = UDP Flood
- **Durée longue + activité modérée** = Reconnaissance

---

## 🎯 Comment Tester

### Test Individuel
1. Lancez `streamlit run streamlit_app/app.py`
2. Sélectionnez **URLLC**
3. Copiez un exemple (B1-B5 ou A1-A8)
4. Cliquez sur **"🔍 Run Detection"**

### Résultats Attendus
- **B1-B5:** Benign (latence ultra-faible)
- **A1, A5:** UDP DDoS Flood
- **A2, A6:** RST Injection
- **A3, A7:** SLA Violation / DoS
- **A4, A8:** Reconnaissance

---

## 📝 Notes Importantes

1. **URLLC = Ultra-Reliable Low-Latency Communications**
2. **Latence critique:** Toute latence > 50ms est suspecte
3. **Trafic minimal:** URLLC utilise très peu de paquets
4. **Pattern clé:** La latence (TcpRtt) est le signal principal

---

## 🔬 Analyse du Dataset Réel

**Malicious moyen:**
- Dur: 1.52s, TotPkts: 3, TotBytes: 709, TcpRtt: 0.0068s (6.8ms)

**Benign moyen:**
- Dur: 0.96s, TotPkts: 7, TotBytes: 6684, TcpRtt: 0.00026s (0.26ms)

**Différence clé:** Malicious a 26x plus de latence! (6.8ms vs 0.26ms)

---

## ⚠️ Types d'Attaques URLLC

- **UDP DDoS Flood**: Paquets uniques instantanés répétés
- **RST Injection**: Injection de paquets RST avec latence élevée
- **SLA Violation / DoS**: Dégradation de la latence au-delà des SLA
- **Reconnaissance**: Scan réseau avec durée longue
