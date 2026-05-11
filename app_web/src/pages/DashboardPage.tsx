import { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import { dashboardService, type AttackDistribution, type DetectionTimepoint, type ModelPerformance, type DashboardMetrics } from '../services/api/dashboardService';

export default function DashboardPage() {
  const [metrics, setMetrics] = useState<DashboardMetrics>({
    total_detections: 0,
    active_threats: 0,
    model_accuracy: 0,
    response_time_ms: 0,
  });
  const [attackData, setAttackData] = useState<AttackDistribution[]>([]);
  const [detectionData, setDetectionData] = useState<DetectionTimepoint[]>([]);
  const [modelPerformance, setModelPerformance] = useState<ModelPerformance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        setLoading(true);
        setError(null);
        const [metricsData, attacksData, timelineData, modelsData] = await Promise.all([
          dashboardService.getMetrics(),
          dashboardService.getAttackDistribution(),
          dashboardService.getDetectionTimeline(),
          dashboardService.getModelPerformance(),
        ]);

        setMetrics(metricsData);
        setAttackData(attacksData);
        setDetectionData(timelineData);
        setModelPerformance(modelsData);
      } catch (err) {
        setError('Erreur lors du chargement des données');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    loadDashboardData();
    // Refresh every 30 seconds
    const interval = setInterval(loadDashboardData, 30000);
    return () => clearInterval(interval);
  }, []);

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
        <h1 className="text-2xl font-semibold text-[#13739f]">Dashboard</h1>
        <p className="mt-2 text-slate-400">Vue d'ensemble de l'IDS et statistiques récentes.</p>
        {error && <p className="mt-2 text-red-400 text-sm">{error}</p>}
      </div>

      {/* KPI Cards */}
      <div className="grid gap-6 lg:grid-cols-4">
        <div className="rounded-3xl border border-slate-800 bg-white/5 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-400">Total Detections</p>
              <p className="text-2xl font-bold text-[#13739f]">{metrics.total_detections.toLocaleString()}</p>
            </div>
            <div className="h-12 w-12 rounded-full bg-[#13739f]/20 flex items-center justify-center">
              <span className="text-[#13739f] text-xl">🔍</span>
            </div>
          </div>
        </div>
        <div className="rounded-3xl border border-slate-800 bg-white/5 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-400">Active Threats</p>
              <p className="text-2xl font-bold text-red-400">{metrics.active_threats}</p>
            </div>
            <div className="h-12 w-12 rounded-full bg-red-400/20 flex items-center justify-center">
              <span className="text-red-400 text-xl">⚠️</span>
            </div>
          </div>
        </div>
        <div className="rounded-3xl border border-slate-800 bg-white/5 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-400">Model Accuracy</p>
              <p className="text-2xl font-bold text-green-400">{metrics.model_accuracy.toFixed(1)}%</p>
            </div>
            <div className="h-12 w-12 rounded-full bg-green-400/20 flex items-center justify-center">
              <span className="text-green-400 text-xl">📈</span>
            </div>
          </div>
        </div>
        <div className="rounded-3xl border border-slate-800 bg-white/5 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-400">Response Time</p>
              <p className="text-2xl font-bold text-blue-400">{metrics.response_time_ms}ms</p>
            </div>
            <div className="h-12 w-12 rounded-full bg-blue-400/20 flex items-center justify-center">
              <span className="text-blue-400 text-xl">⚡</span>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Attack Types Distribution */}
        <div className="rounded-3xl border border-slate-800 bg-white/5 p-6">
          <h3 className="text-lg font-semibold text-[#13739f] mb-4 flex items-center gap-2">
            Types d'Attaques Détectés
            <span
              className="text-xs text-slate-400 rounded-full border border-slate-700 px-2 py-1 cursor-help"
              title="Répartition des types d'attaques détectées par l'IDS, par catégorie d'attaque."
              aria-label="Description : Répartition des types d'attaques détectées par l'IDS, par catégorie d'attaque."
            >
              ?
            </span>
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={attackData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={5}
                dataKey="value"
              >
                {attackData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex flex-wrap gap-4 mt-4">
            {attackData.map((item) => (
              <div key={item.name} className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full legend-dot" style={{ '--legend-color': item.color } as React.CSSProperties}></div>
                <span className="text-sm text-slate-300">{item.name}: {item.value}%</span>
              </div>
            ))}
          </div>
        </div>

        {/* Detection Timeline */}
        <div className="rounded-3xl border border-slate-800 bg-white/5 p-6">
          <h3 className="text-lg font-semibold text-[#13739f] mb-4 flex items-center gap-2">
            Détections par Heure
            <span
              className="text-xs text-slate-400 rounded-full border border-slate-700 px-2 py-1 cursor-help"
              title="Nombre de détections enregistrées pour chaque tranche horaire afin de surveiller les pics d'activité."
              aria-label="Description : Nombre de détections enregistrées pour chaque tranche horaire afin de surveiller les pics d'activité."
            >
              ?
            </span>
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={detectionData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="time" stroke="#9ca3af" />
              <YAxis stroke="#9ca3af" />
              <Tooltip />
              <Line type="monotone" dataKey="detections" stroke="#13739f" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Model Performance */}
      <div className="rounded-3xl border border-slate-800 bg-white/5 p-6">
        <h3 className="text-lg font-semibold text-[#13739f] mb-4">Performance des Modèles</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={modelPerformance}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis dataKey="model" stroke="#9ca3af" />
            <YAxis stroke="#9ca3af" />
            <Tooltip />
            <Bar dataKey="accuracy" fill="#13739f" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
