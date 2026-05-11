import { useState } from 'react';

export default function SettingsPage() {
  const [settings, setSettings] = useState({
    detectionThreshold: 0.8,
    alertFrequency: 'real-time',
    modelRetraining: true,
    dataRetention: 90,
    notifications: {
      email: true,
      slack: false,
      sms: false,
    },
  });

  const handleSettingChange = (key: string, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleNotificationChange = (type: string, checked: boolean) => {
    setSettings(prev => ({
      ...prev,
      notifications: { ...prev.notifications, [type]: checked }
    }));
  };

  const handleSave = () => {
    // Mock save logic
    alert('Paramètres sauvegardés avec succès!');
  };

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-slate-800 bg-white/5 p-6 shadow-soft">
        <h1 className="text-2xl font-semibold text-[#13739f]">Paramètres</h1>
        <p className="mt-2 text-slate-400">Configuration système et paramètres d'IDS.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Detection Settings */}
        <div className="rounded-3xl border border-slate-800 bg-white/5 p-6">
          <h3 className="text-lg font-semibold text-[#13739f] mb-4">Paramètres de Détection</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Seuil de Détection ({(settings.detectionThreshold * 100).toFixed(0)}%)
              </label>
              <input
                type="range"
                min="0.1"
                max="1"
                step="0.1"
                value={settings.detectionThreshold}
                onChange={(e) => handleSettingChange('detectionThreshold', parseFloat(e.target.value))}
                className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer"
                aria-label="Seuil de détection"
                title="Ajuster le seuil de détection (0.1 à 1.0)"
              />
              <div className="flex justify-between text-xs text-slate-400 mt-1">
                <span>10%</span>
                <span>100%</span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Fréquence d'Alerte</label>
              <select
                aria-label="Sélectionner la fréquence d'alerte"
                title="Sélectionner la fréquence d'alerte"
                value={settings.alertFrequency}
                onChange={(e) => handleSettingChange('alertFrequency', e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-900/50 px-3 py-2 text-sm text-white outline-none focus:border-[#13739f]"
              >
                <option value="real-time">Temps réel</option>
                <option value="hourly">Toutes les heures</option>
                <option value="daily">Quotidien</option>
                <option value="weekly">Hebdomadaire</option>
              </select>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-slate-300">Recalibration Automatique du Modèle</label>
                <p className="text-xs text-slate-400">Recalibre automatiquement le modèle en cas de décalage</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.modelRetraining}
                  onChange={(e) => handleSettingChange('modelRetraining', e.target.checked)}
                  className="sr-only peer"
                  aria-label="Recalibration automatique du modèle"
                  title="Activer/désactiver la recalibration automatique du modèle"
                />
                <div className="w-11 h-6 bg-slate-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[#13739f]/25 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#13739f]"></div>
              </label>
            </div>
          </div>
        </div>

        {/* System Settings */}
        <div className="rounded-3xl border border-slate-800 bg-white/5 p-6">
          <h3 className="text-lg font-semibold text-[#13739f] mb-4">Paramètres Système</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Rétention des Données (jours)
              </label>
              <input
                type="number"
                value={settings.dataRetention}
                onChange={(e) => handleSettingChange('dataRetention', parseInt(e.target.value))}
                className="w-full rounded-xl border border-slate-700 bg-slate-900/50 px-3 py-2 text-sm text-white outline-none focus:border-[#13739f]"
                min="1"
                max="365"
                aria-label="Rétention des données en jours"
                title="Nombre de jours de rétention des données (1-365)"
                placeholder="90"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-3">Notifications</label>
              <div className="space-y-2">
                {Object.entries(settings.notifications).map(([type, enabled]) => (
                  <label key={type} className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={enabled}
                      onChange={(e) => handleNotificationChange(type, e.target.checked)}
                      className="w-4 h-4 text-[#13739f] bg-slate-900 border-slate-700 rounded focus:ring-[#13739f] focus:ring-2"
                      aria-label={`Activer les notifications ${type}`}
                      title={`Activer/désactiver les notifications ${type}`}
                    />
                    <span className="text-sm text-slate-300 capitalize">{type}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3">
        <button
          onClick={handleSave}
          className="rounded-xl bg-[#13739f] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#0f5a7a]"
        >
          Sauvegarder les Paramètres
        </button>
        <button className="rounded-xl border border-slate-700 bg-slate-900/50 px-6 py-3 text-sm font-semibold text-slate-300 transition hover:bg-slate-800">
          Réinitialiser
        </button>
      </div>
    </div>
  );
}
