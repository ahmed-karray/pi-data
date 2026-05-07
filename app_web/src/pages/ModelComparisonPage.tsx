import { useState, useEffect, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';
import { trainingService, type ModelMetrics } from '../services/api/trainingService';

type DatasetKey = 'TON_IoT' | 'URLLC' | 'eMBB' | 'mMTC';

type RadarDataPoint = {
  dataset: string;
  [model: string]: string | number;
};

export default function ModelComparisonPage() {
  const [selectedDataset, setSelectedDataset] = useState<DatasetKey>('TON_IoT');
  const [modelMetrics, setModelMetrics] = useState<ModelMetrics[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [promoting, setPromoting] = useState<string | null>(null);

  useEffect(() => {
    const loadModelMetrics = async () => {
      try {
        setLoading(true);
        setError(null);
        const metrics = await trainingService.getModelMetrics(selectedDataset);
        setModelMetrics(metrics);
      } catch (err) {
        setError('Erreur lors du chargement des métriques');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    loadModelMetrics();
  }, [selectedDataset]);

  const handlePromote = async (model: string) => {
    try {
      setPromoting(model);
      await trainingService.promoteModel(selectedDataset);
      alert(`${model} a été promu en production!`);
    } catch (err) {
      alert('Erreur lors de la promotion du modèle');
    } finally {
      setPromoting(null);
    }
  };

  const sortedMetrics = modelMetrics.slice().sort((a, b) => b[selectedDataset] - a[selectedDataset]);
  const datasetScores = modelMetrics.map((model) => ({
    model: model.model,
    score: model[selectedDataset],
  }));
  const bestDatasetModel = datasetScores.slice().sort((a, b) => b.score - a.score)[0];

  const radarDataByDataset: RadarDataPoint[] = useMemo(() => {
    const models = ['LightGBM', 'XGBoost', 'Random Forest', 'Extra Trees', 'MLP', 'Logistic Regression'];
    const datasets: DatasetKey[] = ['TON_IoT', 'eMBB', 'mMTC', 'URLLC'];

    return datasets.map((dataset) => {
      const row: RadarDataPoint = { dataset };

      models.forEach((model) => {
        const entry = modelMetrics.find((item) => item.model === model);
        row[model] = entry ? entry[dataset] : 0;
      });

      return row;
    });
  }, [modelMetrics]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="rounded-3xl border border-slate-800 bg-white/5 p-6 animate-pulse">
          <div className="h-8 bg-slate-700 rounded w-1/4"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-slate-800 bg-white/5 p-6 shadow-soft">
        <h1 className="text-2xl font-semibold text-[#13739f]">Métriques des Modèles</h1>
        <p className="mt-2 text-slate-400">Performances réelles mesurées en F1 Macro par dataset.</p>
        {error && <p className="mt-2 text-red-400 text-sm">{error}</p>}
      </div>

      <div className="rounded-3xl border border-slate-800 bg-white/5 p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h3 id="dataset-filter-label" className="text-lg font-semibold text-[#13739f]">Filtrer par dataset</h3>
            <p className="text-sm text-slate-400">Sélectionnez le dataset pour voir les meilleurs modèles.</p>
          </div>
          <select
            aria-label="Sélectionner un dataset pour filtrer les métriques des modèles"
            aria-labelledby="dataset-filter-label"
            title="Sélectionner un dataset"
            value={selectedDataset}
            onChange={(e) => setSelectedDataset(e.target.value as DatasetKey)}
            className="max-w-[280px] rounded-lg border border-slate-700 bg-slate-900 px-4 py-2 text-white outline-none focus:border-brand-400"
          >
            <option value="TON_IoT">TON_IoT</option>
            <option value="eMBB">eMBB</option>
            <option value="mMTC">mMTC</option>
            <option value="URLLC">URLLC</option>
          </select>
        </div>
      </div>

      {/* Best Model Highlight */}
      {bestDatasetModel && (
        <div className="rounded-3xl border border-green-500/30 bg-green-500/10 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-green-400">🏆 Meilleur Modèle</h3>
              <p className="text-2xl font-bold text-green-300 mt-2">{bestDatasetModel.model}</p>
              <p className="text-sm text-green-400 mt-1">F1 Macro: {bestDatasetModel.score.toFixed(2)}%</p>
            </div>
            <button
              onClick={() => handlePromote(bestDatasetModel.model)}
              disabled={promoting !== null}
              className="px-6 py-2 bg-green-500 hover:bg-green-600 disabled:bg-slate-500 text-white rounded-lg font-semibold transition"
            >
              {promoting === bestDatasetModel.model ? 'Promotion...' : 'Promouvoir'}
            </button>
          </div>
        </div>
      )}

      <div className="rounded-3xl border border-slate-800 bg-white/5 p-6">
        <h3 className="text-lg font-semibold text-[#13739f] mb-4">Comparaison F1 Macro par modèle</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-700">
                <th className="text-left py-3 px-4 text-slate-300">Modèle</th>
                <th className="text-center py-3 px-4 text-slate-300">TON_IoT</th>
                <th className="text-center py-3 px-4 text-slate-300">eMBB</th>
                <th className="text-center py-3 px-4 text-slate-300">mMTC</th>
                <th className="text-center py-3 px-4 text-slate-300">URLLC</th>
                <th className="text-center py-3 px-4 text-slate-300">Moyenne</th>
                <th className="text-center py-3 px-4 text-slate-300">Rang</th>
                <th className="text-center py-3 px-4 text-slate-300">Action</th>
              </tr>
            </thead>
            <tbody>
              {sortedMetrics.map((model) => (
                <tr key={model.model} className="border-b border-slate-800 hover:bg-slate-900/50">
                  <td className="py-3 px-4 font-medium text-[#13739f]">{model.model}</td>
                  <td className="text-center py-3 px-4">{model.TON_IoT.toFixed(2)}%</td>
                  <td className="text-center py-3 px-4">{model.eMBB.toFixed(2)}%</td>
                  <td className="text-center py-3 px-4">{model.mMTC.toFixed(2)}%</td>
                  <td className="text-center py-3 px-4">{model.URLLC.toFixed(2)}%</td>
                  <td className="text-center py-3 px-4 font-semibold text-brand-400">{model.average.toFixed(2)}%</td>
                  <td className="text-center py-3 px-4 font-bold text-[#13739f]">#{model.rank}</td>
                  <td className="text-center py-3 px-4">
                    <button
                      onClick={() => handlePromote(model.model)}
                      className="rounded-lg bg-[#13739f] px-3 py-1 text-xs font-semibold text-white transition hover:bg-[#0f5a7a]"
                    >
                      Promouvoir
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <div className="rounded-3xl border border-slate-800 bg-white/5 p-6">
          <h3 className="text-lg font-semibold text-[#13739f] mb-4">F1 Macro par dataset</h3>
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={sortedMetrics}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="model" stroke="#9ca3af" angle={-25} textAnchor="end" height={80} />
              <YAxis stroke="#9ca3af" domain={[0, 100]} />
              <Tooltip formatter={(value) => `${(value as number).toFixed(2)}%`} />
              <Legend />
              <Bar dataKey="TON_IoT" name="TON_IoT" fill="#13739f" />
              <Bar dataKey="eMBB" name="eMBB" fill="#4ecdc4" />
              <Bar dataKey="mMTC" name="mMTC" fill="#f9ca24" />
              <Bar dataKey="URLLC" name="URLLC" fill="#e74c3c" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-3xl border border-slate-800 bg-white/5 p-6">
          <h3 className="text-lg font-semibold text-[#13739f] mb-4">F1 Macro {selectedDataset}</h3>
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={sortedMetrics} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis type="number" stroke="#9ca3af" domain={[0, 100]} />
              <YAxis dataKey="model" type="category" stroke="#9ca3af" width={120} />
              <Tooltip formatter={(value) => `${(value as number).toFixed(2)}%`} />
              <Bar dataKey={selectedDataset} fill="#13739f" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="rounded-3xl border border-slate-800 bg-white/5 p-6">
        <h3 className="text-lg font-semibold text-[#13739f] mb-4">Comparaison par Dataset</h3>
        <ResponsiveContainer width="100%" height={320}>
          <LineChart data={radarDataByDataset}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis dataKey="dataset" stroke="#9ca3af" />
            <YAxis stroke="#9ca3af" domain={[0, 100]} />
            <Tooltip formatter={(value) => `${(value as number).toFixed(2)}%`} />
            <Legend />
            <Line type="monotone" dataKey="LightGBM" stroke="#13739f" strokeWidth={2} />
            <Line type="monotone" dataKey="XGBoost" stroke="#4ecdc4" strokeWidth={2} />
            <Line type="monotone" dataKey="Random Forest" stroke="#f9ca24" strokeWidth={2} />
            <Line type="monotone" dataKey="Extra Trees" stroke="#e74c3c" strokeWidth={2} />
            <Line type="monotone" dataKey="MLP" stroke="#95e1d3" strokeWidth={2} />
            <Line type="monotone" dataKey="Logistic Regression" stroke="#d4a5a5" strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <div className="rounded-3xl border border-slate-800 bg-white/5 p-6 text-center">
          <h4 className="text-sm text-slate-400 mb-2">Meilleur modèle</h4>
          <p className="text-2xl font-bold text-brand-400">LightGBM</p>
          <p className="text-xs text-slate-500 mt-1">89.55% F1 Macro moyen</p>
        </div>
        <div className="rounded-3xl border border-slate-800 bg-white/5 p-6 text-center">
          <h4 className="text-sm text-slate-400 mb-2">Top modèle pour {selectedDataset}</h4>
          <p className="text-2xl font-bold text-brand-400">{bestDatasetModel.model}</p>
          <p className="text-xs text-slate-500 mt-1">{bestDatasetModel.score.toFixed(2)}% F1 Macro</p>
        </div>
        <div className="rounded-3xl border border-slate-800 bg-white/5 p-6 text-center">
          <h4 className="text-sm text-slate-400 mb-2">Modèles évalués</h4>
          <p className="text-2xl font-bold text-brand-400">6</p>
          <p className="text-xs text-slate-500 mt-1">LightGBM, XGBoost, Random Forest, Extra Trees, MLP, Logistic Regression</p>
        </div>
      </div>
    </div>
  );
}
