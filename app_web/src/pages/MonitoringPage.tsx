import { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { monitoringService, type Alert, type DriftData, type PipelineStage } from '../services/api/monitoringService';

export default function MonitoringPage() {
  const [selectedAlert, setSelectedAlert] = useState<number | null>(null);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [driftData, setDriftData] = useState<DriftData[]>([]);
  const [pipelineData, setPipelineData] = useState<PipelineStage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadMonitoringData = async () => {
      try {
        setLoading(true);
        setError(null);
        const [alertsData, driftHistoryData, pipelineStatusData] = await Promise.all([
          monitoringService.getAlerts(),
          monitoringService.getDriftHistory(),
          monitoringService.getPipelineStatus(),
        ]);

        setAlerts(alertsData);
        setDriftData(driftHistoryData);
        setPipelineData(pipelineStatusData);
      } catch (err) {
        setError('Erreur lors du chargement des données de monitoring');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    loadMonitoringData();
    // Refresh every 20 seconds
    const interval = setInterval(loadMonitoringData, 20000);
    return () => clearInterval(interval);
  }, []);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'text-red-400 bg-red-400/20';
      case 'medium': return 'text-yellow-400 bg-yellow-400/20';
      case 'low': return 'text-green-400 bg-green-400/20';
      default: return 'text-slate-400 bg-slate-400/20';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success': return 'text-green-400';
      case 'running': return 'text-blue-400';
      case 'pending': return 'text-slate-400';
      case 'failed': return 'text-red-400';
      default: return 'text-slate-400';
    }
  };

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
        <h1 className="text-2xl font-semibold text-[#13739f]">Monitoring</h1>
        <p className="mt-2 text-slate-400">Suivi de la dérive, des alertes et du pipeline ML.</p>
        {error && <p className="mt-2 text-red-400 text-sm">{error}</p>}
      </div>

      {/* Alerts Section */}
      <div className="rounded-3xl border border-slate-800 bg-white/5 p-6">
        <h3 className="text-lg font-semibold text-[#13739f] mb-4">Alertes Récentes</h3>
        <div className="space-y-3">
          {alerts.map((alert) => (
            <div
              key={alert.id}
              className={`rounded-xl border p-4 cursor-pointer transition ${
                selectedAlert === alert.id ? 'border-[#13739f] bg-[#13739f]/10' : 'border-slate-700 bg-slate-900/50 hover:bg-slate-800/50'
              }`}
              onClick={() => setSelectedAlert(selectedAlert === alert.id ? null : alert.id)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className={`rounded-lg px-2 py-1 text-xs font-semibold ${getSeverityColor(alert.severity)}`}>
                    {alert.severity.toUpperCase()}
                  </span>
                  <span className="font-medium text-white">{alert.type}</span>
                </div>
                <span className="text-sm text-slate-400">{new Date(alert.time).toLocaleString()}</span>
              </div>
              <p className="mt-2 text-sm text-slate-300">{alert.message}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Model Drift */}
        <div className="rounded-3xl border border-slate-800 bg-white/5 p-6">
          <h3 className="text-lg font-semibold text-[#13739f] mb-4">Détection de Décalage du Modèle</h3>
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={driftData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="time" stroke="#9ca3af" />
              <YAxis stroke="#9ca3af" domain={[0, 0.2]} />
              <Tooltip />
              <Area type="monotone" dataKey="drift" stroke="#ff6b6b" fill="#ff6b6b" fillOpacity={0.3} />
            </AreaChart>
          </ResponsiveContainer>
          <p className="text-sm text-slate-400 mt-2">
            Seuil de recalibration: 0.15 (actuellement: {(driftData.length > 0 ? (driftData[driftData.length - 1].drift * 100).toFixed(1) : '0')}%)
          </p>
        </div>

        {/* System Performance */}
        <div className="rounded-3xl border border-slate-800 bg-white/5 p-6">
          <h3 className="text-lg font-semibold text-[#13739f] mb-4">Statut du Système</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-300">API Backend</span>
              <span className="text-sm font-semibold text-green-400">✓ Actif</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-300">Models Chargés</span>
              <span className="text-sm font-semibold text-green-400">✓ 4/4</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-300">Pipeline ML</span>
              <span className="text-sm font-semibold text-blue-400">⟳ En cours</span>
            </div>
          </div>
        </div>
      </div>

      {/* ML Pipeline */}
      <div className="rounded-3xl border border-slate-800 bg-white/5 p-6">
        <h3 className="text-lg font-semibold text-[#13739f] mb-4">Pipeline ML</h3>
        <div className="space-y-3">
          {pipelineData.map((stage) => (
            <div key={stage.stage} className="flex items-center gap-4">
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <span className={`w-3 h-3 rounded-full ${stage.status === 'success' ? 'bg-green-400' : stage.status === 'running' ? 'bg-blue-400 animate-pulse' : 'bg-slate-500'}`}></span>
                <span className="text-sm font-medium text-[#122359] truncate">{stage.stage}</span>

              </div>
              <span className={`text-sm font-semibold ${getStatusColor(stage.status)}`}>
                {stage.status === 'success' ? '✓' : stage.status === 'running' ? '⟳' : stage.status === 'pending' ? '○' : '✗'}
              </span>
              <span className="text-sm text-slate-400 min-w-[60px] text-right">
                {stage.duration > 0 ? `${stage.duration}s` : '--'}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
