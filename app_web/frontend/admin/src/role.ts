export const ROLE_CONFIG = {
  appName: 'IOTinel Administrator Console',
  brandLine: 'Always watching. Always protecting.',
  role: 'administrator',
  roleLabel: 'Administrator',
  accent: '#BA7517',
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
    { path: '/model-comparison', label: 'Model Comparison' },
    { path: '/monitoring', label: 'Monitoring' },
    { path: '/training', label: 'Training' },
    { path: '/drift-metrics', label: 'Drift Metrics' },
    { path: '/shap-explanations', label: 'SHAP Explanations' },
    { path: '/access-requests', label: 'Access Requests' },
    { path: '/user-management', label: 'User Management' },
    { path: '/settings', label: 'Settings' },
    { path: '/platform', label: 'Platform' },
    { path: '/swagger', label: 'Swagger' },
  ],
  enabledPages: ['dashboard', 'live-detection', 'batch-analysis', 'model-comparison', 'monitoring', 'training', 'drift-metrics', 'shap-explanations', 'access-requests', 'user-management', 'settings', 'platform', 'swagger'],
} as const;

export type SupportedRole = keyof typeof ROLE_CONFIG.redirectMap;
