import axios from 'axios';
import { RecentDetection } from '../../types';

export interface PredictRequest {
  dataset: string;
  features: Record<string, number>;
}

export interface PredictResponse {
  dataset: string;
  prediction: string;
  probabilities?: Record<string, number>;
  used_features?: string[];
}

const API = axios.create({
  baseURL: '/api',
  timeout: 10000,
});

API.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

const fakeResults: RecentDetection[] = [
  { timestamp: '2026-04-18 12:35', flowId: 'BL-021', dataset: 'eMBB', prediction: 'Malicious', attackType: 'DDoS', confidence: 0.86, status: 'Alert' },
  { timestamp: '2026-04-18 12:24', flowId: 'BL-045', dataset: 'mMTC', prediction: 'Benign', attackType: 'Scanning', confidence: 0.12, status: 'Normal' }
];

const detectionService = {
  async listDatasets() {
    const response = await API.get('/datasets');
    const data = response.data;
    if (Array.isArray(data)) {
      return data;
    }
    if (Array.isArray(data.datasets)) {
      return data.datasets;
    }
    if (data && typeof data === 'object') {
      return Object.values(data);
    }
    return [];
  },

  async predict(features: PredictRequest): Promise<PredictResponse> {
    const response = await API.post('/predict', features);
    return response.data;
  },

  async batchPredict(file: File) {
    const formData = new FormData();
    formData.append('file', file);

    const response = await API.post('/batch_predict', formData);
    return response.data;
  },

  // Legacy local dataset functions (keep for compatibility)
  async loadDataset(datasetName: string) {
    try {
      const filePath = `/data/${datasetName}.csv`;
      const response = await fetch(filePath);
      if (!response.ok) throw new Error(`Failed to load ${datasetName}`);
      const csv = await response.text();
      const lines = csv.trim().split('\n');
      const headers = lines[0].split(',').map((h) => h.trim());
      const rows = lines.slice(1).map((line) => {
        const values = line.split(',').map((v) => v.trim());
        const row: any = {};
        headers.forEach((header, index) => {
          row[header] = values[index];
        });
        return row;
      });
      return {
        name: datasetName,
        headers,
        rows,
        rowCount: rows.length,
        columnCount: headers.length
      };
    } catch (error) {
      console.error(`Error loading dataset ${datasetName}:`, error);
      return null;
    }
  },

  async getDatasetPreview(datasetName: string, limit = 10) {
    const dataset = await detectionService.loadDataset(datasetName);
    if (!dataset) return null;
    return {
      ...dataset,
      rows: dataset.rows.slice(0, limit)
    };
  },

  async generateDataset(numRows = 10, datasetType = 'mixed') {
    const headers = ['Dur', 'TotPkts', 'TotBytes', 'Rate', 'Load', 'Loss', 'pLoss', 'TcpRtt'];
    const rows: Record<string, string>[] = [];
    for (let i = 0; i < numRows; i++) {
      const row: Record<string, string> = {};
      headers.forEach(header => {
        switch (header) {
          case 'Dur':
            row[header] = (Math.random() * 100 + 1).toFixed(2);
            break;
          case 'TotPkts':
            row[header] = Math.floor(Math.random() * 10000 + 100).toString();
            break;
          case 'TotBytes':
            row[header] = Math.floor(Math.random() * 1000000 + 10000).toString();
            break;
          case 'Rate':
            row[header] = (Math.random() * 1000 + 10).toFixed(2);
            break;
          case 'Load':
            row[header] = (Math.random() * 100 + 1).toFixed(2);
            break;
          case 'Loss':
            row[header] = Math.floor(Math.random() * 100 + 1).toString();
            break;
          case 'pLoss':
            row[header] = (Math.random() * 10).toFixed(2);
            break;
          case 'TcpRtt':
            row[header] = (Math.random() * 500 + 10).toFixed(2);
            break;
        }
      });
      rows.push(row);
    }
    return {
      name: `synthetic_${datasetType}`,
      headers,
      rows,
      rowCount: rows.length,
      columnCount: headers.length
    };
  },

  uploadBatch: async (file: File, dataset: string) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('dataset', dataset);

    const response = await API.post('/batch_predict', formData);
    return response.data;
  },

  startBatchAnalysis: async (dataset: string) => {
    const response = await API.post('/batch_analyze', { dataset });
    return response.data;
  },

  getBatchStatus: async (job_id: string) => {
    await new Promise(r => setTimeout(r, 600));
    return {
      job_id,
      status: 'completed' as const,
      progress: 100,
      results: fakeResults
    };
  },

  exportBatch: async (job_id: string) => {
    await new Promise(r => setTimeout(r, 300));
    const csv = 'flowId,dataset,prediction,attackType,confidence\nBL-021,eMBB,Malicious,DDoS,0.86\nBL-045,mMTC,Benign,Scanning,0.12';
    return new Blob([csv], { type: 'text/csv' });
  }
};

export { detectionService };

