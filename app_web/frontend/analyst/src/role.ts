export const ROLE_CONFIG = {
  appName: 'IOTinel Analyst Console',
  brandLine: 'Always watching. Always protecting.',
  role: 'security_analyst',
  roleLabel: 'Security Analyst',
  accent: '#1D9E75',
  homePath: '/dashboard',
  redirectMap: {
    security_analyst: 'http://localhost:8010/analyst/dashboard',
    data_scientist: 'http://localhost:8010/scientist/monitoring',
    administrator: 'http://localhost:8010/administrator/dashboard',
  },
  menu: [
    { path: '/dashboard', label: 'Dashboard' },
    { path: '/live-detection', label: 'Live Detection' },
    { path: '/batch-analysis', label: 'Batch Analysis' },
    { path: '/model-comparison', label: 'Prediction History' },
    { path: '/swagger', label: 'Swagger' },
  ],
  enabledPages: ['dashboard', 'live-detection', 'batch-analysis', 'model-comparison', 'swagger'],
} as const;

export type SupportedRole = keyof typeof ROLE_CONFIG.redirectMap;
