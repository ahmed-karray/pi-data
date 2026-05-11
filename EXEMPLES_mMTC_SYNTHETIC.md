# 🧪 Exemples Synthétiques mMTC - BENIGN & MALICIOUS

**Features:** Dur, TotPkts, TotBytes, SrcBytes, pLoss, Load, Loss, Rate

---

## ✅ EXEMPLES BENIGN (Trafic Normal IoT)

### Exemple B1 - Capteur IoT Normal
```
Dur: 3.200000
TotPkts: 28
TotBytes: 4500
SrcBytes: 2100
pLoss: 16.000000
Load: 11250.00
Loss: 2
Rate: 8.750000
```
**Caractéristiques:** Communication IoT normale, plusieurs paquets, taille raisonnable

---

### Exemple B2 - Device IoT Actif
```
Dur: 4.500000
TotPkts: 45
TotBytes: 15000
SrcBytes: 5500
pLoss: 20.000000
Load: 26666.67
Loss: 4
Rate: 10.000000
```
**Caractéristiques:** Device IoT avec activité soutenue, beaucoup de paquets

---

### Exemple B3 - Transmission IoT Courte
```
Dur: 1.100000
TotPkts: 11
TotBytes: 1400
SrcBytes: 700
pLoss: 8.333333
Load: 10181.82
Loss: 1
Rate: 10.000000
```
**Caractéristiques:** Transmission courte mais rate normal pour IoT

---

### Exemple B4 - Capteur Multi-données
```
Dur: 4.200000
TotPkts: 52
TotBytes: 18500
SrcBytes: 6200
pLoss: 23.076923
Load: 35238.10
Loss: 5
Rate: 12.380952
```
**Caractéristiques:** Capteur envoyant beaucoup de données, rate élevé

---

### Exemple B5 - IoT Burst Normal
```
Dur: 0.950000
TotPkts: 10
TotBytes: 1350
SrcBytes: 650
pLoss: 9.090909
Load: 11368.42
Loss: 1
Rate: 10.526316
```
**Caractéristiques:** Burst court mais avec rate normal (>10 pkt/s)

---

## 🚨 EXEMPLES MALICIOUS (Attaques IoT)

### Exemple A1 - TCP SYN Scan (Lent)
```
Dur: 2.600000
TotPkts: 12
TotBytes: 1250
SrcBytes: 730
pLoss: 7.692308
Load: 3846.15
Loss: 1
Rate: 4.615385
```
**Caractéristiques d'attaque:**
- Peu de paquets (12) pour durée longue (2.6s)
- Rate très faible (4.6 pkt/s) vs benign (8-12 pkt/s)
- Load faible (3.8K) vs benign (10K+)
- Pattern: scan lent, reconnaissance

---

### Exemple A2 - Connection Flooding (Minimal)
```
Dur: 1.900000
TotPkts: 9
TotBytes: 1600
SrcBytes: 305
pLoss: 10.000000
Load: 6736.84
Loss: 1
Rate: 4.736842
```
**Caractéristiques d'attaque:**
- Très peu de paquets (9)
- SrcBytes très faible (305) vs benign (650+)
- Rate faible (4.7 pkt/s)
- Pattern: tentatives de connexion multiples

---

### Exemple A3 - Slow-Rate Exhaustion
```
Dur: 3.800000
TotPkts: 14
TotBytes: 1180
SrcBytes: 780
pLoss: 6.666667
Load: 2484.21
Loss: 1
Rate: 3.684211
```
**Caractéristiques d'attaque:**
- Durée longue (3.8s) mais peu de paquets (14)
- Rate très faible (3.68 pkt/s)
- Load très faible (2.5K)
- Pattern: épuisement lent des ressources

---

### Exemple A4 - FIN Scan
```
Dur: 2.300000
TotPkts: 14
TotBytes: 1195
SrcBytes: 785
pLoss: 12.500000
Load: 4152.17
Loss: 2
Rate: 6.086957
```
**Caractéristiques d'attaque:**
- Peu de paquets (14)
- pLoss élevé (12.5%)
- Rate faible (6.09 pkt/s)
- Pattern: scan FIN, connexions anormales

---

### Exemple A5 - Reconnaissance Lente
```
Dur: 4.200000
TotPkts: 16
TotBytes: 1330
SrcBytes: 850
pLoss: 11.111111
Load: 2533.33
Loss: 2
Rate: 3.809524
```
**Caractéristiques d'attaque:**
- Durée très longue (4.2s) mais peu de paquets (16)
- Rate très faible (3.81 pkt/s)
- Load très faible (2.5K)
- Pattern: reconnaissance discrète

---

### Exemple A6 - SYN Scan Rapide
```
Dur: 1.850000
TotPkts: 9
TotBytes: 1590
SrcBytes: 300
pLoss: 10.000000
Load: 6875.68
Loss: 1
Rate: 4.864865
```
**Caractéristiques d'attaque:**
- Très peu de paquets (9)
- SrcBytes minimal (300)
- Rate faible (4.86 pkt/s)
- Pattern: scan SYN rapide

---

### Exemple A7 - Connection Probing
```
Dur: 2.800000
TotPkts: 12
TotBytes: 1070
SrcBytes: 735
pLoss: 7.692308
Load: 3057.14
Loss: 1
Rate: 4.285714
```
**Caractéristiques d'attaque:**
- Peu de paquets (12)
- Load faible (3K)
- Rate faible (4.29 pkt/s)
- Pattern: sondage de connexions

---

### Exemple A8 - Slow Scan Extended
```
Dur: 4.650000
TotPkts: 17
TotBytes: 1400
SrcBytes: 870
pLoss: 5.555556
Load: 2408.60
Loss: 1
Rate: 3.655914
```
**Caractéristiques d'attaque:**
- Durée très longue (4.65s) mais peu de paquets (17)
- Rate très faible (3.66 pkt/s)
- Load très faible (2.4K)
- Pattern: scan étendu lent

---

## 📊 Patterns de Détection

### BENIGN (Normal IoT)
- ✅ TotPkts: 10-52 (beaucoup de paquets)
- ✅ TotBytes: 1,350-18,500 (transfert significatif)
- ✅ SrcBytes: 650-6,200 (données source importantes)
- ✅ Rate: 8-12 pkt/s (RATE ÉLEVÉ)
- ✅ Load: 10,000-35,000 (charge normale)
- ✅ pLoss: 8-23% (variable, peut être élevé)

### MALICIOUS (Attaque IoT)
- 🚨 TotPkts: 9-17 (TRÈS PEU de paquets)
- 🚨 TotBytes: 1,070-1,600 (PETITE taille)
- 🚨 SrcBytes: 300-870 (DONNÉES SOURCE FAIBLES)
- 🚨 Rate: 3.6-6.1 pkt/s (RATE TRÈS FAIBLE)
- 🚨 Load: 2,400-6,900 (CHARGE FAIBLE)
- 🚨 pLoss: 5.6-12.5% (modéré)

### 🔑 Clé de Détection
Le modèle détecte les attaques par:
- **Rate FAIBLE (<7 pkt/s) + Peu de paquets (<20) = MALICIOUS**
- **Rate ÉLEVÉ (>8 pkt/s) + Beaucoup de paquets (>25) = BENIGN**
- **Load FAIBLE (<7K) + SrcBytes FAIBLE (<900) = MALICIOUS**

---

## 🎯 Comment Tester

### Test Individuel
1. Lancez `streamlit run streamlit_app/app.py`
2. Sélectionnez **mMTC**
3. Copiez un exemple (B1-B5 ou A1-A8)
4. Cliquez sur **"🔍 Run Detection"**

### Résultats Attendus
- **B1-B5:** Benign (confiance < 30%)
- **A1-A8:** Attack détecté (confiance > 70%)

---

## 📝 Notes Importantes

1. **Ces exemples sont synthétiques** - Créés pour tester le modèle
2. **Basés sur l'analyse réelle du dataset mMTC** - Patterns authentiques
3. **Non utilisés dans l'entraînement** - Test de généralisation
4. **Pattern clé: Rate faible + Peu de paquets** - Signal principal

---

## 🔬 Analyse du Dataset Réel

**Malicious moyen:**
- Dur: 2.73s, TotPkts: 12, TotBytes: 1.46KB, Rate: 4.4 pkt/s, Load: 4K

**Benign moyen:**
- Dur: 2.76s, TotPkts: 32, TotBytes: 12.5KB, Rate: 19.9 pkt/s, Load: 68K

**Différence clé:** Benign a 2.7x plus de paquets, 8.6x plus de bytes, 4.5x plus de rate!

---

## ⚠️ Types d'Attaques mMTC

Selon la logique de classification:
- **TCP SYN Scan / Connection Flooding**: TotPkts < 10 et Dur < 1.0s
- **Slow-Rate Resource Exhaustion**: Dur > 3.0s et Load < 3000
- **FIN Scan**: Autres cas (pLoss élevé, rate faible)
