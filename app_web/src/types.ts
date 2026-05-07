export type Role = 'security_analyst' | 'data_scientist' | 'administrator';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: Role;
}

export interface AuthPayload {
  access_token: string;
  user: AuthUser;
  expires_at: string;
}

export interface RecentDetection {
  timestamp: string;
  flowId: string;
  dataset: string;
  prediction: 'Malicious' | 'Benign';
  attackType: string;
  confidence: number;
  status: 'Alert' | 'Normal';
}

export interface DatasetPreview {
  name: string;
  headers: string[];
  rows: Record<string, string>[];
  rowCount: number;
  columnCount: number;
}

