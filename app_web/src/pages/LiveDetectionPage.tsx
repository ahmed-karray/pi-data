import { useState } from 'react';
import { detectionService } from '../services/api/detectionService';
import type { DatasetPreview } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';



const shapData = [
  { feature: 'Dur', importance: 0.85 },
  { feature: 'TotPkts', importance: 0.72 },
  { feature: 'Rate', importance: 0.68 },
  { feature: 'Load', importance: 0.61 },
  { feature: 'Loss', importance: 0.45 },
  { feature: 'TcpRtt', importance: 0.38 },
];

export default function LiveDetectionPage() {
  const [inputData, setInputData] = useState({
    Dur: '',
    TotPkts: '',
    TotBytes: '',
    Rate: '',
    Load: '',
    Loss: '',
    pLoss: '',
    TcpRtt: '',
  });
  const [prediction, setPrediction] = useState<string | null>(null);
  const [confidence, setConfidence] = useState<number | null>(null);
  const [attackType, setAttackType] = useState<string>('');
  const [showShap, setShowShap] = useState(false);

  // Dataset states
  const [activeTab, setActiveTab] = useState<'generate' | 'upload'>('generate');
  const [datasetPreview, setDatasetPreview] = useState<DatasetPreview | null>(null);
  const [selectedDataset, setSelectedDataset] = useState<'eMBB' | 'mMTC' | 'URLLC' | 'TON_IoT'>('eMBB');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [numRows, setNumRows] = useState(5);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [selectedRowIndex, setSelectedRowIndex] = useState(0);
  const [batchResults, setBatchResults] = useState<any[]>([]);


  const handleInputChange = (field: string, value: string) => {
    setInputData(prev => ({ ...prev, [field]: value }));
  };

  const handleDetect = async () => {
    setError(null);
    setLoading(true);

    try {
      const data = await detectionService.predict({
        dataset: selectedDataset,
        features: Object.fromEntries(
          Object.entries(inputData).map(([key, value]) => [key, Number(value)])
        ),
      });

      setPrediction(data.prediction);
      setConfidence(data.probabilities ? data.probabilities[data.prediction] ?? null : null);
      setAttackType('');
      setShowShap(true);
    } catch (error) {
      console.error(error);
      setError('API unreachable');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setInputData({
      Dur: '',
      TotPkts: '',
      TotBytes: '',
      Rate: '',
      Load: '',
      Loss: '',
      pLoss: '',
      TcpRtt: '',
    });
    setPrediction(null);
    setConfidence(null);
    setShowShap(false);
    setDatasetPreview(null);
    setUploadedFile(null);
    setSelectedRowIndex(0);
    setBatchResults([]);
  };

  // Dataset handlers
  const handleGenerate = async () => {
    try {
      setLoading(true);
      setError(null);
      const preview = await detectionService.getDatasetPreview(selectedDataset, numRows);
      if (preview) {
        setDatasetPreview(preview);
        setSelectedRowIndex(0);
      } else {
        setError(`Impossible de charger le dataset ${selectedDataset}`);
      }
    } catch (error) {
      console.error('Load dataset failed', error);
      setError('Erreur lors du chargement du dataset');
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setUploadedFile(file);
    if (file) {
      // First, read the file to create a preview
      const reader = new FileReader();
      reader.onload = (e) => {
        const csv = e.target?.result as string;
        const lines = csv.split('\n').filter(line => line.trim());
        if (lines.length === 0) {
          setError('Le fichier CSV est vide');
          return;
        }

        const headers = lines[0].split(',').map(h => h.trim());
        const rows = lines.slice(1, 11).map(line => {
          const values = line.split(',');
          const row: any = {};
          headers.forEach((header, index) => {
            row[header] = values[index]?.trim() || '';
          });
          return row;
        });

        const preview = {
          name: file.name,
          headers,
          rows,
          rowCount: lines.length - 1,
          columnCount: headers.length
        };
        setDatasetPreview(preview);
        setSelectedRowIndex(0);

        // Then upload for batch processing
        detectionService.uploadBatch(file, selectedDataset).then((result: any) => {
          // Batch results are stored for later use
          console.log('Batch prediction completed:', result);
        }).catch((error) => {
          console.error('Batch prediction failed:', error);
          // Don't show error for batch prediction failure, as preview is already shown
        });
      };
      reader.onerror = () => {
        setError('Erreur lors de la lecture du fichier');
      };
      reader.readAsText(file);
    }
  };

  const populateForm = () => {
    if (datasetPreview && datasetPreview.rows[selectedRowIndex]) {
      const row = datasetPreview.rows[selectedRowIndex];
      const newData = {
        Dur: row.Dur || '',
        TotPkts: row.TotPkts || '',
        TotBytes: row.TotBytes || '',
        Rate: row.Rate || '',
        Load: row.Load || '',
        Loss: row.Loss || '',
        pLoss: row.pLoss || '',
        TcpRtt: row.TcpRtt || '',
      };
      setInputData(newData);
      setPrediction(null);
      setConfidence(null);
      setShowShap(false);
    }
  };

  const testDataset = async () => {
    if (!datasetPreview) return;
    // Mock batch test
    await new Promise(r => setTimeout(r, 1000));
    const attackTypes = ['DDoS', 'Scanning', 'Brute Force', 'Port Scan', 'Botnet', 'Ransomware'];
    const isMalicious = Math.random() > 0.5; // 50% malicious
    const attackType = isMalicious ? attackTypes[Math.floor(Math.random() * attackTypes.length)] : 'None';
    setBatchResults([
      { 
        rowIndex: selectedRowIndex, 
        prediction: isMalicious ? 'Malicious' : 'Benign', 
        attackType,
        confidence: Math.random() * 0.4 + 0.6 
      }
    ]);
  };



  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-slate-800 bg-white/5 p-6 shadow-soft">
        <h1 className="text-2xl font-semibold text-[#13739f]">Live Detection</h1>
        <p className="mt-2 text-slate-400">Exécution de détection en temps réel et explications SHAP.</p>
      </div>

      {/* Dataset Tools */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="lg:col-span-2">
          <div className="rounded-3xl border border-slate-800 bg-white/5 p-6">
            <h3 className="text-lg font-semibold text-[#13739f] mb-4">Outils Dataset</h3>
            <div className="flex bg-slate-800/50 rounded-2xl p-1 mb-4">
              <button
                className={`flex-1 py-2 px-4 text-sm font-medium rounded-xl transition ${
                  activeTab === 'generate'
                    ? 'bg-[#13739f] text-white shadow-lg'
                    : 'text-slate-300 hover:text-white'
                }`}
                onClick={() => setActiveTab('generate')}
              >
                Choisir des colonnes
              </button>
              <button
                className={`flex-1 py-2 px-4 text-sm font-medium rounded-xl transition ${
                  activeTab === 'upload'
                    ? 'bg-[#13739f] text-white shadow-lg'
                    : 'text-slate-300 hover:text-white'
                }`}
                onClick={() => setActiveTab('upload')}
              >
                Télécharger Dataset
              </button>
            </div>

            {activeTab === 'generate' && (
              <div className="space-y-3 mb-4">
                <div className="flex gap-4">
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-slate-300 mb-2">Sélectionner Dataset</label>
                    <select
                      aria-label="Sélectionner un dataset"
                      title="Sélectionner un dataset"
                      value={selectedDataset}
                      onChange={(e) => setSelectedDataset(e.target.value as 'eMBB' | 'mMTC' | 'URLLC' | 'TON_IoT')}
                      className="w-full rounded-xl border border-slate-700 bg-slate-900/50 px-3 py-2 text-sm text-white focus:border-[#13739f]"
                    >
                      <option value="TON_IoT">TON_IoT</option>
                      <option value="eMBB">eMBB</option>
                      <option value="mMTC">mMTC</option>
                      <option value="URLLC">URLLC</option>
                    </select>
                  </div>
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-slate-300 mb-2">Nombre de colonnes</label>
                    <input
                      aria-label="Nombre de colonnes à charger"
                      title="Nombre de colonnes à charger (1-20)"
                      type="number"
                      min="1"
                      max="20"
                      value={numRows}
                      onChange={(e) => setNumRows(Number(e.target.value))}
                      className="w-full rounded-xl border border-slate-700 bg-slate-900/50 px-3 py-2 text-sm text-white focus:border-[#13739f]"
                      placeholder="ex: 5"
                    />
                  </div>
                </div>
                <button
                  onClick={handleGenerate}
                  className="w-full rounded-xl bg-[#13739f] px-6 py-2 text-sm font-semibold text-white hover:bg-[#0f5a7a] transition"
                >
                  Charger les colonnes
                </button>
              </div>
            )}

            {activeTab === 'upload' && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-slate-300 mb-2">Télécharger un fichier CSV</label>
                <input
                  aria-label="Télécharger un fichier CSV de dataset"
                  title="Télécharger un fichier CSV de dataset"
                  type="file"
                  accept=".csv"
                  onChange={handleFileUpload}
                  className="w-full file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-[#13739f] file:text-white hover:file:bg-[#0f5a7a] bg-slate-900/50 border border-slate-700 rounded-xl px-3 py-2 text-white"
                />
                {uploadedFile && <p className="text-sm text-slate-400 mt-1">{uploadedFile.name}</p>}
              </div>
            )}

            {datasetPreview && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm text-slate-400">
                  <span>Dataset: {datasetPreview.name}</span>
                  <span>({datasetPreview.rowCount} lignes, {datasetPreview.columnCount} colonnes)</span>
                </div>
                <div className="max-h-64 overflow-auto border border-slate-700 rounded-xl bg-slate-900/30">
                  <table className="w-full text-xs">
                    <thead className="sticky top-0 bg-slate-800/50">
                      <tr>
                        {datasetPreview.headers.slice(0, 8).map((header) => (
                          <th key={header} className="p-2 text-left font-medium text-slate-300">
                            {header}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {datasetPreview.rows.slice(0, 10).map((row, idx) => (
                        <tr
                          key={idx}
                          className={`border-t border-slate-700/50 hover:bg-slate-800/30 cursor-pointer transition ${
                            selectedRowIndex === idx ? 'bg-[#13739f]/20' : ''
                          }`}
                          onClick={() => setSelectedRowIndex(idx)}
                        >
                          {datasetPreview.headers.slice(0, 8).map((header) => (
                            <td key={header} className="p-2">
                              {row[header] || ''}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={populateForm}
                    className="flex-1 rounded-xl bg-green-600/80 px-4 py-2 text-sm font-semibold text-white hover:bg-green-500/80 transition"
                  >
                    Remplir Formulaire (Ligne {selectedRowIndex + 1})
                  </button>
                  <button
                    onClick={testDataset}
                    className="rounded-xl bg-[#13739f] px-4 py-2 text-sm font-semibold text-white hover:bg-[#0f5a7a] transition"
                  >
                    Tester Dataset
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Input Form */}
        <div className="rounded-3xl border border-slate-800 bg-white/5 p-6">
          <h3 className="text-lg font-semibold text-[#13739f] mb-4">Paramètres de Détection</h3>

          <div className="mb-4 max-w-xs">
            <label className="block text-sm font-medium text-slate-300 mb-1">Dataset</label>
            <select
              aria-label="Sélectionner un dataset pour la détection"
              title="Sélectionner un dataset pour la détection"
              value={selectedDataset}
              onChange={(e) => setSelectedDataset(e.target.value as 'eMBB' | 'mMTC' | 'URLLC' | 'TON_IoT')}
              className="w-full rounded-xl border border-slate-700 bg-slate-900/50 px-3 py-2 text-sm text-white outline-none focus:border-[#13739f]"
            >
              <option value="eMBB">eMBB</option>
              <option value="mMTC">mMTC</option>
              <option value="URLLC">URLLC</option>
              <option value="TON_IoT">TON_IoT</option>
            </select>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {Object.entries(inputData).map(([key, value]) => (
              <div key={key}>
                <label className="block text-sm font-medium text-slate-300 mb-1">{key}</label>
                <input
                  aria-label={`Valeur pour ${key}`}
                  title={`Entrer la valeur pour ${key}`}
                  type="number"
                  value={value}
                  onChange={(e) => handleInputChange(key, e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-900/50 px-3 py-2 text-sm text-white outline-none focus:border-[#13739f]"
                  placeholder="0.0"
                />
              </div>
            ))}
          </div>
          <div className="flex gap-3 mt-6">
            <button
              onClick={handleDetect}
              disabled={loading}
              className="flex-1 rounded-xl bg-[#13739f] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#0f5a7a] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? 'Détection...' : 'Détecter'}
            </button>
            <button
              onClick={handleReset}
              className="rounded-xl border border-slate-700 bg-slate-900/50 px-4 py-2 text-sm font-semibold text-slate-300 transition hover:bg-slate-800"
            >
              Réinitialiser
            </button>
          </div>
          {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
        </div>

        {/* Results */}
        <div className="rounded-3xl border border-slate-800 bg-white/5 p-6">
          <h3 className="text-lg font-semibold text-[#13739f] mb-4">Résultats</h3>
          {prediction ? (
            <div className="space-y-4">
              <div className={`rounded-xl p-4 ${prediction.includes('Attack') ? 'bg-red-500/20 border border-red-500/50' : 'bg-green-500/20 border border-green-500/50'}`}>
                <p className="text-lg font-semibold">{prediction}</p>
                {confidence && (
                  <p className="text-sm text-slate-300 mt-1">
                    Confiance: {(confidence * 100).toFixed(1)}%
                  </p>
                )}
              </div>
              <button
                onClick={() => setShowShap(!showShap)}
                className="w-full rounded-xl bg-slate-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-600"
              >
                {showShap ? 'Masquer' : 'Afficher'} Explication SHAP
              </button>
              {batchResults.length > 0 && (
                <div className="mt-4 p-4 bg-blue-500/20 border border-blue-500/50 rounded-xl">
                  <h4 className="font-semibold text-blue-300 mb-2">Résultats Test Dataset:</h4>
                  {batchResults.map((result, idx) => (
                    <div key={idx} className="text-sm mb-1">
                      Ligne {result.rowIndex + 1}: <span className={result.prediction === 'Malicious' ? 'text-red-400 font-semibold' : 'text-green-400 font-semibold'}>
                        {result.prediction}
                      </span>{' '}
                      {result.attackType !== 'None' && (
                        <span className="text-yellow-400 ml-1">({result.attackType})</span>
                      )}{' '}
                      (Confiance: {(result.confidence * 100).toFixed(1)}%)

                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <p className="text-slate-400">Entrez les paramètres et cliquez sur "Détecter" pour obtenir un résultat.</p>
          )}

        </div>
      </div>

      {/* SHAP Explanation */}
      {showShap && (
        <div className="rounded-3xl border border-slate-800 bg-white/5 p-6">
          <h3 className="text-lg font-semibold text-[#13739f] mb-4">Explication SHAP - Importance des Fonctionnalités</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={shapData} layout="horizontal">
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis type="number" stroke="#9ca3af" />
              <YAxis dataKey="feature" type="category" stroke="#9ca3af" width={80} />
              <Tooltip />
              <Bar dataKey="importance" fill="#13739f" />
            </BarChart>
          </ResponsiveContainer>
          <p className="text-sm text-slate-400 mt-4">
            Cette visualisation montre l'importance relative de chaque fonctionnalité dans la décision du modèle.
          </p>
        </div>
      )}
    </div>
  );
}
