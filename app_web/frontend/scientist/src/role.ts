export const ROLE_CONFIG = {
  appName: 'IOTinel Scientist Console',
  brandLine: 'Always watching. Always protecting.',
  role: 'data_scientist',
  roleLabel: 'Data Scientist',
  accent: '#185FA5',
  homePath: '/monitoring',
  redirectMap: {
    security_analyst: 'http://localhost:8010/analyst/dashboard',
    data_scientist: 'http://localhost:8010/scientist/monitoring',
    administrator: 'http://localhost:8010/administrator/dashboard',
  },
  menu: [
    { path: '/monitoring', label: 'Monitoring' },
    { path: '/model-comparison', label: 'Model Comparison' },
    { path: '/training', label: 'Training' },
    { path: '/drift-metrics', label: 'Drift Metrics' },
    { path: '/shap-explanations', label: 'SHAP Explanations' },
    { path: '/swagger', label: 'Swagger' },
  ],
  enabledPages: ['monitoring', 'model-comparison', 'training', 'drift-metrics', 'shap-explanations', 'swagger'],
} as const;

export type SupportedRole = keyof typeof ROLE_CONFIG.redirectMap;
