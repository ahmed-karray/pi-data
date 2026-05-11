import axios from 'axios';

const API = axios.create({
  baseURL: '/api',
  timeout: 30000,
});

API.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export interface Alert {
  id: number;
  type: string;
  severity: 'high' | 'medium' | 'low';
  time: string;
  message: string;
}

export interface DriftData {
  time: string;
  drift: number;
}

export interface PipelineStage {
  stage: string;
  status: 'success' | 'running' | 'pending' | 'failed';
  duration: number;
}

export interface ModelDrift {
  dataset: string;
  current_drift: number;
  threshold: number;
  needs_retrain: boolean;
}

const monitoringService = {
  // Get recent alerts
  async getAlerts(): Promise<Alert[]> {
    try {
      const response = await API.get('/alerts');
      return response.data.alerts || [];
    } catch (error) {
      console.warn('Alert endpoint not available, returning defaults');
      return [
        { id: 1, type: 'High Traffic', severity: 'high', time: new Date().toISOString(), message: 'Détection de trafic anormal' },
        { id: 2, type: 'Model Drift', severity: 'medium', time: new Date(Date.now() - 3600000).toISOString(), message: 'Décalage détecté' },
      ];
    }
  },

  // Get model drift monitoring
  async getModelDrift(): Promise<ModelDrift[]> {
    try {
      const response = await API.get('/monitor/drift');
      return response.data.drift_metrics || [];
    } catch (error) {
      console.warn('Drift monitoring not available');
      return [
        {
          dataset: 'eMBB',
          current_drift: 0.12,
          threshold: 0.15,
          needs_retrain: false,
        },
        {
          dataset: 'URLLC',
          current_drift: 0.18,
          threshold: 0.15,
          needs_retrain: true,
        },
      ];
    }
  },

  // Get drift history for charts
  async getDriftHistory(dataset?: string): Promise<DriftData[]> {
    try {
      const response = await API.get('/monitor/drift-history', {
        params: { dataset },
      });
      return response.data.history || [];
    } catch (error) {
      // Return mock data
      return Array.from({ length: 6 }, (_, i) => ({
        time: `Day ${i + 1}`,
        drift: Math.random() * 0.2,
      }));
    }
  },

  // Get ML pipeline status
  async getPipelineStatus(): Promise<PipelineStage[]> {
    try {
      const response = await API.get('/monitor/pipeline');
      return response.data.stages || [];
    } catch (error) {
      console.warn('Pipeline monitoring not available');
      return [
        { stage: 'Data Ingestion', status: 'success', duration: 120 },
        { stage: 'Preprocessing', status: 'success', duration: 85 },
        { stage: 'Feature Engineering', status: 'success', duration: 95 },
        { stage: 'Model Training', status: 'running', duration: 180 },
        { stage: 'Validation', status: 'pending', duration: 0 },
        { stage: 'Deployment', status: 'pending', duration: 0 },
      ];
    }
  },

  // Trigger retraining when drift is detected
  async triggerRetrain(dataset: string): Promise<{ message: string }> {
    try {
      const response = await API.post('/retrain', { dataset });
      return response.data;
    } catch (error) {
      throw new Error(`Failed to trigger retrain: ${error}`);
    }
  },
};

export { monitoringService };
