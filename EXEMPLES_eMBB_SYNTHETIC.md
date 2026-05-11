# 🧪 Exemples Synthétiques eMBB - BENIGN & MALICIOUS

**Features:** Dur, TotPkts, TotBytes, Rate, Load, Loss, pLoss, TcpRtt

---

## ✅ EXEMPLES BENIGN (Trafic Normal)

### Exemple B1 - Navigation Web Normale
```
Dur: 0.850000
TotPkts: 25
TotBytes: 4200
Rate: 29.411765
Load: 39529.41176
Loss: 1
pLoss: 3.846154
TcpRtt: 0.018500
```
**Caractéristiques:** Durée courte, peu de paquets, charge normale, RTT excellent

---

### Exemple B2 - Streaming Vidéo HD
```
Dur: 3.500000
TotPkts: 650
TotBytes: 780000
Rate: 185.714286
Load: 1782857.14
Loss: 2
pLoss: 0.307692
TcpRtt: 0.042000
```
**Caractéristiques:** Longue durée, beaucoup de paquets, charge élevée mais stable, perte minimale

---

### Exemple B3 - Téléchargement de Fichier
```
Dur: 2.200000
TotPkts: 420
TotBytes: 520000
Rate: 190.909091
Load: 1890909.09
Loss: 1
pLoss: 0.238095
TcpRtt: 0.035000
```
**Caractéristiques:** Transfert de données important, perte très faible, RTT stable

---

### Exemple B4 - Visioconférence
```
Dur: 4.800000
TotPkts: 580
TotBytes: 450000
Rate: 120.833333
Load: 750000.00
Loss: 3
pLoss: 0.515464
TcpRtt: 0.028000
```
**Caractéristiques:** Communication bidirectionnelle, perte acceptable, faible latence

---

### Exemple B5 - Gaming Online
```
Dur: 1.500000
TotPkts: 180
TotBytes: 95000
Rate: 120.000000
Load: 506666.67
Loss: 1
pLoss: 0.555556
TcpRtt: 0.015000
```
**Caractéristiques:** Paquets fréquents, RTT très faible (critique pour gaming), perte minimale

---

## 🚨 EXEMPLES MALICIOUS (Attaques)

### Exemple A1 - Attaque Type 1 (Courte durée, peu de paquets)
```
Dur: 0.250000
TotPkts: 18
TotBytes: 12500
Rate: 72.000000
Load: 400000.00
Loss: 1
pLoss: 5.263158
TcpRtt: 0.020000
```
**Caractéristiques d'attaque:**
- Durée très courte (0.25s) vs benign (2-4s)
- Très peu de paquets (18) vs benign (100-300)
- Petite taille totale (12.5KB) vs benign (100-200KB)
- Pattern: connexion anormalement courte avec peu de données

---

### Exemple A2 - Attaque Type 2 (Très courte, rate élevé)
```
Dur: 0.180000
TotPkts: 17
TotBytes: 12650
Rate: 94.444444
Load: 562777.78
Loss: 1
pLoss: 5.555556
TcpRtt: 0.019000
```
**Caractéristiques d'attaque:**
- Durée extrêmement courte (0.18s)
- Rate élevé (94 pkt/s) pour si peu de paquets
- Load élevé (562K) pour durée courte
- Pattern: burst rapide anormal

---

### Exemple A3 - Attaque Type 3 (Minimal packets)
```
Dur: 0.350000
TotPkts: 19
TotBytes: 13000
Rate: 54.285714
Load: 297142.86
Loss: 1
pLoss: 5.000000
TcpRtt: 0.025000
```
**Caractéristiques d'attaque:**
- Durée courte (0.35s)
- Nombre minimal de paquets (19)
- Taille fixe suspecte (~13KB)
- Pattern: connexion incomplète ou scan

---

### Exemple A4 - Attaque Type 4 (High rate, short)
```
Dur: 0.200000
TotPkts: 20
TotBytes: 12800
Rate: 100.000000
Load: 512000.00
Loss: 1
pLoss: 4.761905
TcpRtt: 0.022000
```
**Caractéristiques d'attaque:**
- Durée très courte (0.2s)
- Rate très élevé (100 pkt/s)
- Load élevé pour durée courte
- Pattern: flood léger

---

### Exemple A5 - Attaque Type 5 (Minimal duration)
```
Dur: 0.175000
TotPkts: 17
TotBytes: 12400
Rate: 97.142857
Load: 567314.29
Loss: 1
pLoss: 5.555556
TcpRtt: 0.018500
```
**Caractéristiques d'attaque:**
- Durée minimale (0.175s)
- Très peu de paquets (17)
- Rate très élevé (97 pkt/s)
- Pattern: connexion avortée ou scan rapide

---

### Exemple A6 - Attaque Type 6 (Medium duration, low packets)
```
Dur: 0.650000
TotPkts: 22
TotBytes: 13200
Rate: 33.846154
Load: 162461.54
Loss: 1
pLoss: 4.347826
TcpRtt: 0.028000
```
**Caractéristiques d'attaque:**
- Durée moyenne (0.65s) mais peu de paquets (22)
- Ratio durée/paquets anormal
- Taille suspecte (~13KB)
- Pattern: connexion lente anormale

---

### Exemple A7 - Attaque Type 7 (Very short, high load)
```
Dur: 0.190000
TotPkts: 18
TotBytes: 12700
Rate: 94.736842
Load: 535789.47
Loss: 1
pLoss: 5.263158
TcpRtt: 0.021000
```
**Caractéristiques d'attaque:**
- Durée très courte (0.19s)
- Load très élevé (535K)
- Rate élevé (94 pkt/s)
- Pattern: burst de saturation

---

### Exemple A8 - Attaque Type 8 (Longest attack, still short)
```
Dur: 0.750000
TotPkts: 24
TotBytes: 13500
Rate: 32.000000
Load: 144000.00
Loss: 1
pLoss: 4.000000
TcpRtt: 0.030000
```
**Caractéristiques d'attaque:**
- Durée "longue" pour attaque (0.75s) mais courte vs benign
- Peu de paquets (24) vs benign (100+)
- Taille totale faible (13.5KB) vs benign (100KB+)
- Pattern: connexion anormalement inefficace

---

## 📊 Patterns de Détection

### BENIGN (Normal)
- ✅ Dur: 0.7-4.0s (durée normale)
- ✅ TotPkts: 34-230 (beaucoup de paquets)
- ✅ TotBytes: 18,900-218,000 (transfert significatif)
- ✅ Rate: 44-83 pkt/s (modéré)
- ✅ Load: 228,000-475,000 (charge normale)
- ✅ pLoss: 0.6-4.4% (perte acceptable)
- ✅ TcpRtt: 0.029-0.042s (latence normale)

### MALICIOUS (Attaque)
- 🚨 Dur: 0.17-0.75s (TRÈS COURT vs benign)
- 🚨 TotPkts: 17-24 (TRÈS PEU de paquets)
- 🚨 TotBytes: 12,400-13,600 (PETITE taille)
- 🚨 Rate: 30-100 pkt/s (peut être élevé pour durée courte)
- 🚨 Load: 135,000-567,000 (variable)
- 🚨 pLoss: 3.8-5.6% (modéré)
- 🚨 TcpRtt: 0.017-0.041s (normal)

### 🔑 Clé de Détection
Le modèle détecte les attaques par le ratio anormal:
- **Durée COURTE + Paquets FAIBLES + Bytes FAIBLES = MALICIOUS**
- **Durée LONGUE + Paquets NOMBREUX + Bytes ÉLEVÉS = BENIGN**

---

## 🎯 Comment Tester

### Test Individuel
1. Lancez `streamlit run app.py`
2. Sélectionnez **eMBB**
3. Copiez un exemple (B1-B5 ou A1-A8)
4. Cliquez sur **"🔍 Run Detection"**

### Résultats Attendus
- **B1-B5:** Benign (confiance < 30%)
- **A1-A8:** Attack détecté (confiance > 70%)

---

## 📝 Notes Importantes

1. **Ces exemples sont synthétiques** - Créés pour tester le modèle, pas extraits du dataset
2. **Basés sur l'analyse réelle du dataset** - Les caractéristiques correspondent aux vrais patterns malicious eMBB
3. **Non utilisés dans l'entraînement** - Parfait pour tester la généralisation du modèle
4. **Pattern clé: Durée courte + Peu de paquets** - C'est le signal principal de détection

---

## ⚠️ Si le Modèle Échoue

Si le modèle classe mal ces exemples:
- **Faux négatifs (attaque non détectée):** Les valeurs sont peut-être trop proches du benign, ajustez Dur/TotPkts
- **Faux positifs (benign classé attaque):** Threshold trop bas ou features trop similaires
- **Vérifiez le threshold** dans la sidebar (défaut: 30%)

---

## 🔬 Analyse du Dataset Réel

**Malicious moyen:**
- Dur: 0.66s, TotPkts: 28, TotBytes: 21.6KB, Rate: 56 pkt/s, pLoss: 4.5%

**Benign moyen:**
- Dur: 2.40s, TotPkts: 171, TotBytes: 148KB, Rate: 81 pkt/s, pLoss: 2.5%

**Différence clé:** Benign a 3.6x plus de durée, 6x plus de paquets, 7x plus de bytes!
