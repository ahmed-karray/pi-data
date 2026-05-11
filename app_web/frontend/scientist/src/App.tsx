import { FormEvent, ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ROLE_CONFIG, SupportedRole } from './role';

type DatasetRow = {
  dataset: string;
  feature_list: string[];
  rows: number;
  class_balance: Record<string, number>;
};
type TrainRun = {
  run_id: string;
  dataset: string;
  status: string;
  accuracy?: number;
  f1?: number;
  auc?: number;
  created_at?: string;
  mlflow_link?: string;
};
type AuthUser = {
  id: number;
  full_name: string;
  email: string;
  role: SupportedRole;
  status: string;
  is_active: boolean;
};
type AuthResponse = {
  access_token: string;
  token_type: string;
  user: AuthUser;
};
type TrainLogSnapshot = {
  run_id: string;
  status: string;
  logs: string[];
  error?: string | null;
  result?: Record<string, unknown> | null;
};
type ModelOption =
  | 'xgboost'
  | 'lightgbm'
  | 'random_forest'
  | 'logistic_regression'
  | 'extra_trees'
  | 'mlp';
type HyperparameterValue = string | number;
type ModelHyperparameters = Record<ModelOption, Record<string, HyperparameterValue>>;
type TrainAllProgress = {
  current: number;
  total: number;
};
type HyperparameterField =
  | {
      key: string;
      label: string;
      type: 'number' | 'text';
      step?: string;
      placeholder?: string;
    }
  | {
      key: string;
      label: string;
      type: 'select';
      options: string[];
    };
type StatTileProps = {
  label: string;
  value: string;
  hint?: string;
};

const API_BASE = 'http://localhost:8010';
const GATEWAY_LOGIN_URL = `${API_BASE}/login`;
const STORAGE_KEY = 'iotinel_user_session';
const IS_GATEWAY = window.location.port === '8010';
const APP_PREFIX = IS_GATEWAY ? '/scientist' : '';
const LOGIN_PATH = '/login';
const HOME_PATH = `${APP_PREFIX}${ROLE_CONFIG.homePath}`;

const MODEL_OPTIONS: Array<{ value: ModelOption; label: string }> = [
  { value: 'xgboost', label: 'XGBoost' },
  { value: 'lightgbm', label: 'LightGBM' },
  { value: 'random_forest', label: 'Random Forest' },
  { value: 'logistic_regression', label: 'Logistic Regression' },
  { value: 'extra_trees', label: 'Extra Trees' },
  { value: 'mlp', label: 'MLP' },
];

const MODEL_FIELD_CONFIG: Record<ModelOption, HyperparameterField[]> = {
  xgboost: [
    { key: 'n_estimators', label: 'N Estimators', type: 'number' },
    { key: 'learning_rate', label: 'Learning Rate', type: 'number', step: '0.001' },
    { key: 'max_depth', label: 'Max Depth', type: 'number' },
  ],
  lightgbm: [
    { key: 'n_estimators', label: 'N Estimators', type: 'number' },
    { key: 'learning_rate', label: 'Learning Rate', type: 'number', step: '0.001' },
    { key: 'num_leaves', label: 'Num Leaves', type: 'number' },
  ],
  random_forest: [
    { key: 'n_estimators', label: 'N Estimators', type: 'number' },
    { key: 'max_depth', label: 'Max Depth', type: 'number' },
    { key: 'min_samples_split', label: 'Min Samples Split', type: 'number' },
  ],
  logistic_regression: [
    { key: 'C', label: 'Regularization C', type: 'number', step: '0.01' },
    { key: 'max_iter', label: 'Max Iterations', type: 'number' },
    { key: 'solver', label: 'Solver', type: 'select', options: ['lbfgs', 'saga', 'liblinear'] },
  ],
  extra_trees: [
    { key: 'n_estimators', label: 'N Estimators', type: 'number' },
    { key: 'max_depth', label: 'Max Depth', type: 'number' },
    { key: 'min_samples_split', label: 'Min Samples Split', type: 'number' },
  ],
  mlp: [
    { key: 'hidden_layer_sizes', label: 'Hidden Layers (comma-separated)', type: 'text', placeholder: '100,50' },
    { key: 'max_iter', label: 'Max Iterations', type: 'number' },
    { key: 'learning_rate_init', label: 'Initial Learning Rate', type: 'number', step: '0.0001' },
    { key: 'activation', label: 'Activation', type: 'select', options: ['relu', 'tanh', 'logistic'] },
  ],
};

const DEFAULT_MODEL_HYPERPARAMETERS: ModelHyperparameters = {
  xgboost: { n_estimators: 300, learning_rate: 0.05, max_depth: 6 },
  lightgbm: { n_estimators: 300, learning_rate: 0.05, num_leaves: 63 },
  random_forest: { n_estimators: 100, max_depth: 10, min_samples_split: 2 },
  logistic_regression: { C: 1.0, max_iter: 200, solver: 'lbfgs' },
  extra_trees: { n_estimators: 100, max_depth: 10, min_samples_split: 2 },
  mlp: { hidden_layer_sizes: '100,50', max_iter: 200, learning_rate_init: 0.001, activation: 'relu' },
};

function parseNumRowsValue(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number(trimmed);
  if (!Number.isInteger(parsed) || parsed <= 0) return null;
  return parsed;
}

function parseHyperparameterValue(field: HyperparameterField, value: HyperparameterValue): HyperparameterValue {
  if (field.type === 'text' || field.type === 'select') {
    return String(value);
  }
  const numeric = Number(value);
  return Number.isNaN(numeric) ? value : numeric;
}

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    credentials: 'include',
    headers: init?.body instanceof FormData ? undefined : { 'Content-Type': 'application/json' },
    ...init,
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(String(payload.detail || payload.error || `Request failed: ${path}`));
  }
  return response.json() as Promise<T>;
}

function isAuthError(message: string): boolean {
  return ['Authentication required', 'Invalid token', 'User not available', 'Insufficient permissions'].some((token) =>
    message.includes(token),
  );
}

function readStoredUser(): AuthUser | null {
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
}

function writeStoredUser(user: AuthUser | null): void {
  if (!user) {
    window.localStorage.removeItem(STORAGE_KEY);
    return;
  }
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
}

function routeFor(path: string): string {
  return `${APP_PREFIX}${path}`;
}

function normalizePath(pathname: string): string {
  if (APP_PREFIX && pathname.startsWith(APP_PREFIX)) {
    const trimmed = pathname.slice(APP_PREFIX.length);
    return trimmed || '/';
  }
  return pathname || '/';
}

function redirectForRole(role: SupportedRole): string {
  return ROLE_CONFIG.redirectMap[role];
}

function StatTile({ label, value, hint }: StatTileProps) {
  return (
    <div className="insight-tile">
      <div className="insight-label">{label}</div>
      <div className="insight-value">{value}</div>
      {hint ? <div className="insight-hint">{hint}</div> : null}
    </div>
  );
}

function SparkBars({ items, tone = 'sky' }: { items: Array<{ label: string; value: number }>; tone?: 'sky' | 'emerald' | 'amber' }) {
  const max = Math.max(...items.map((item) => item.value), 1);
  return (
    <div className="spark-bars">
      {items.map((item) => (
        <div key={item.label} className="spark-row">
          <div className="spark-meta">
            <span>{item.label}</span>
            <strong>{item.value.toFixed(2)}</strong>
          </div>
          <div className="spark-track">
            <div className={`spark-fill ${tone}`} style={{ width: `${(item.value / max) * 100}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function MiniAreaChart({ points, title, xAxisLabel, yAxisLabel }: { points: number[]; title?: string; xAxisLabel?: string; yAxisLabel?: string }) {
  if (!points.length) {
    return <div className="empty-state">No chart data available yet.</div>;
  }

  // ✅ Single point guard
  if (points.length === 1) {
    return (
      <div style={{ width: '100%' }}>
        {title && (
          <div style={{ textAlign: 'center', fontSize: 16, fontWeight: 700, color: 'rgba(255,255,255,0.95)', marginBottom: 12 }}>
            {title}
          </div>
        )}
        <div style={{ textAlign: 'center', padding: '40px 20px', borderRadius: 16, background: 'rgba(96,165,250,0.08)', border: '1px solid rgba(96,165,250,0.2)' }}>
          <div style={{ fontSize: 40, fontWeight: 800, color: '#60a5fa', textShadow: '0 2px 12px rgba(96,165,250,0.5)' }}>{points[0]}</div>
          <div style={{ marginTop: 12, fontSize: 14, fontWeight: 500, color: 'rgba(255,255,255,0.5)' }}>
            Only 1 data point — more data needed to display a trend.
          </div>
        </div>
      </div>
    );
  }

  const width = 800;
  const height = 360;
  const padding = { top: 50, right: 80, bottom: 70, left: 90 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  const max = Math.max(...points, 1);
  const min = Math.min(...points, 0);
  const range = max - min || 1;

  const step = chartWidth / (points.length - 1);

  const coords = points.map((value, index) => ({
    x: padding.left + index * step,
    y: padding.top + chartHeight - ((value - min) / range) * chartHeight,
  }));

  const polyline = coords.map((c) => `${c.x},${c.y}`).join(' ');

  const area = [
    `${coords[0].x},${padding.top + chartHeight}`,
    ...coords.map((c) => `${c.x},${c.y}`),
    `${coords[coords.length - 1].x},${padding.top + chartHeight}`,
  ].join(' ');

  const yTicks = 5;
  const yTickValues = Array.from({ length: yTicks }, (_, i) => min + (range * i) / (yTicks - 1));
  const xTicks = Math.min(points.length, 8);
  const xTickIndices = Array.from({ length: xTicks }, (_, i) =>
    Math.round(((points.length - 1) * i) / Math.max(xTicks - 1, 1))
  );

  return (
    <div className="space-y-4">
      {title && <div style={{ fontSize: 18, fontWeight: 700, color: 'rgba(255,255,255,0.95)', textAlign: 'center', marginBottom: 8 }}>{title}</div>}
      <svg className="mini-area-chart" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="xMidYMid meet">
        {/* Grid lines */}
        {yTickValues.map((value, i) => {
          const y = padding.top + chartHeight - ((value - min) / range) * chartHeight;
          return <line key={`grid-${i}`} x1={padding.left} y1={y} x2={padding.left + chartWidth} y2={y} stroke="rgba(255,255,255,0.08)" strokeWidth="1.5" />;
        })}

        {/* Area fill */}
        <polygon points={area} className="mini-area-fill" />
        
        {/* Line */}
        <polyline points={polyline} className="mini-area-line" strokeWidth="4" />

        {/* Data points */}
        {coords.map((c, i) => (
          <g key={`point-${i}`}>
            <circle cx={c.x} cy={c.y} r="7" fill="#60a5fa" stroke="#1e3a8a" strokeWidth="2" filter="drop-shadow(0 2px 6px rgba(96,165,250,0.6))" />
          </g>
        ))}

        {/* Axes */}
        <line x1={padding.left} y1={padding.top} x2={padding.left} y2={padding.top + chartHeight} stroke="rgba(255,255,255,0.3)" strokeWidth="2.5" />
        <line x1={padding.left} y1={padding.top + chartHeight} x2={padding.left + chartWidth} y2={padding.top + chartHeight} stroke="rgba(255,255,255,0.3)" strokeWidth="2.5" />

        {/* Y-axis labels */}
        {yTickValues.map((value, i) => {
          const y = padding.top + chartHeight - ((value - min) / range) * chartHeight;
          return (
            <text key={`y-label-${i}`} x={padding.left - 12} y={y + 5} textAnchor="end" fontSize="16" fill="rgba(255,255,255,0.85)" fontWeight="600">
              {value >= 1000 ? `${(value / 1000).toFixed(1)}k` : value.toFixed(0)}
            </text>
          );
        })}

        {/* X-axis labels */}
        {xTickIndices.map((idx, i) => (
          <text key={`x-label-${i}`} x={padding.left + idx * step} y={padding.top + chartHeight + 30} textAnchor="middle" fontSize="16" fill="rgba(255,255,255,0.85)" fontWeight="600">
            {idx + 1}
          </text>
        ))}

        {/* Y-axis title */}
        {yAxisLabel && (
          <text
            x={25}
            y={padding.top + chartHeight / 2}
            textAnchor="middle"
            fontSize="16"
            fill="rgba(255,255,255,0.9)"
            fontWeight="700"
            transform={`rotate(-90, 25, ${padding.top + chartHeight / 2})`}
          >
            {yAxisLabel}
          </text>
        )}

        {/* X-axis title */}
        {xAxisLabel && (
          <text x={padding.left + chartWidth / 2} y={height - 12} textAnchor="middle" fontSize="16" fill="rgba(255,255,255,0.9)" fontWeight="700">
            {xAxisLabel}
          </text>
        )}

        {/* Max value label */}
        <text x={padding.left + chartWidth + 12} y={padding.top + 8} fontSize="15" fill="rgba(96,165,250,0.95)" fontWeight="800">
          Max: {max >= 1000 ? `${(max / 1000).toFixed(1)}k` : max.toFixed(0)}
        </text>
      </svg>
    </div>
  );
}

function MultiSeriesAccuracyChart({
  series,
  title,
  xAxisLabel,
  yAxisLabel,
}: {
  series: Array<{ label: string; points: number[]; color: string }>;
  title?: string;
  xAxisLabel?: string;
  yAxisLabel?: string;
}) {
  if (!series.length || !series.some((entry) => entry.points.length > 0)) {
    return <div className="empty-state">No chart data available yet.</div>;
  }

  const width = 860;
  const height = 380;
  const padding = { top: 50, right: 110, bottom: 70, left: 90 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;
  const maxPoints = Math.max(...series.map((entry) => entry.points.length), 1);
  const flatPoints = series.flatMap((entry) => entry.points);
  const max = Math.max(...flatPoints, 1);
  const min = Math.min(...flatPoints, 0);
  const range = max - min || 1;
  const step = maxPoints > 1 ? chartWidth / (maxPoints - 1) : 0;
  const yTicks = 5;
  const yTickValues = Array.from({ length: yTicks }, (_, i) => min + (range * i) / (yTicks - 1));
  const xTickCount = Math.min(maxPoints, 8);
  const xTickIndices = Array.from({ length: xTickCount }, (_, i) =>
    Math.round(((maxPoints - 1) * i) / Math.max(xTickCount - 1, 1)),
  );

  const seriesCoords = series.map((entry) => ({
    ...entry,
    coords: entry.points.map((value, index) => ({
      x: padding.left + index * step,
      y: padding.top + chartHeight - ((value - min) / range) * chartHeight,
      value,
    })),
  }));

  return (
    <div className="space-y-4">
      {title ? (
        <div style={{ fontSize: 18, fontWeight: 700, color: 'rgba(255,255,255,0.95)', textAlign: 'center', marginBottom: 8 }}>
          {title}
        </div>
      ) : null}
      <div className="flex flex-wrap items-center justify-center gap-3 text-sm">
        {series.map((entry) => (
          <div key={entry.label} className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: entry.color }} />
            <span className="text-slate-200">{entry.label}</span>
          </div>
        ))}
      </div>
      <svg className="mini-area-chart" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="xMidYMid meet">
        {yTickValues.map((value, i) => {
          const y = padding.top + chartHeight - ((value - min) / range) * chartHeight;
          return <line key={`grid-${i}`} x1={padding.left} y1={y} x2={padding.left + chartWidth} y2={y} stroke="rgba(255,255,255,0.08)" strokeWidth="1.5" />;
        })}

        <line x1={padding.left} y1={padding.top} x2={padding.left} y2={padding.top + chartHeight} stroke="rgba(255,255,255,0.3)" strokeWidth="2.5" />
        <line x1={padding.left} y1={padding.top + chartHeight} x2={padding.left + chartWidth} y2={padding.top + chartHeight} stroke="rgba(255,255,255,0.3)" strokeWidth="2.5" />

        {seriesCoords.map((entry) => {
          if (!entry.coords.length) return null;
          const linePoints = entry.coords.map((coord) => `${coord.x},${coord.y}`).join(' ');
          return (
            <g key={entry.label}>
              <polyline
                points={linePoints}
                fill="none"
                stroke={entry.color}
                strokeWidth="4"
                strokeLinejoin="round"
                strokeLinecap="round"
                opacity="0.95"
              />
              {entry.coords.map((coord, index) => (
                <circle
                  key={`${entry.label}-${index}`}
                  cx={coord.x}
                  cy={coord.y}
                  r="6"
                  fill={entry.color}
                  stroke="rgba(15,23,42,0.95)"
                  strokeWidth="2"
                  filter={`drop-shadow(0 2px 6px ${entry.color}88)`}
                />
              ))}
              {entry.coords.length ? (
                <text
                  x={entry.coords[entry.coords.length - 1].x + 10}
                  y={entry.coords[entry.coords.length - 1].y + 5}
                  fontSize="14"
                  fill={entry.color}
                  fontWeight="800"
                >
                  {entry.label}
                </text>
              ) : null}
            </g>
          );
        })}

        {yTickValues.map((value, i) => {
          const y = padding.top + chartHeight - ((value - min) / range) * chartHeight;
          return (
            <text key={`y-label-${i}`} x={padding.left - 12} y={y + 5} textAnchor="end" fontSize="16" fill="rgba(255,255,255,0.85)" fontWeight="600">
              {value.toFixed(0)}
            </text>
          );
        })}

        {xTickIndices.map((idx, i) => (
          <text key={`x-label-${i}`} x={padding.left + idx * step} y={padding.top + chartHeight + 30} textAnchor="middle" fontSize="16" fill="rgba(255,255,255,0.85)" fontWeight="600">
            {idx + 1}
          </text>
        ))}

        {yAxisLabel ? (
          <text
            x={25}
            y={padding.top + chartHeight / 2}
            textAnchor="middle"
            fontSize="16"
            fill="rgba(255,255,255,0.9)"
            fontWeight="700"
            transform={`rotate(-90, 25, ${padding.top + chartHeight / 2})`}
          >
            {yAxisLabel}
          </text>
        ) : null}

        {xAxisLabel ? (
          <text x={padding.left + chartWidth / 2} y={height - 12} textAnchor="middle" fontSize="16" fill="rgba(255,255,255,0.9)" fontWeight="700">
            {xAxisLabel}
          </text>
        ) : null}

        <text x={padding.left + chartWidth + 12} y={padding.top + 8} fontSize="15" fill="rgba(255,255,255,0.9)" fontWeight="800">
          Max: {max.toFixed(0)}%
        </text>
      </svg>
    </div>
  );
}

function Shell({
  user,
  title,
  subtitle,
  activePath,
  onLogout,
  children,
}: {
  user: AuthUser | null;
  title: string;
  subtitle: string;
  activePath: string;
  onLogout: () => void;
  children: ReactNode;
}) {
  return (
    <div className="app-shell">
      <aside className="app-sidebar">
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="brand-mark">S</div>
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.28em] text-sky-300">IOTinel</div>
              <div className="text-lg font-semibold">Scientist Workspace</div>
            </div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-slate-950/70 p-4">
            <div className="text-sm font-semibold">{user?.full_name || 'Data Scientist'}</div>
            <div className="mt-1 text-sm text-slate-400">{user?.email || 'signed in'}</div>
            <div className="mt-3 status-pill success">Role: Scientist</div>
          </div>
        </div>

        <div>
          <div className="sidebar-section-label">Model Ops</div>
          <nav className="space-y-2">
            {ROLE_CONFIG.menu.map((item) => (
              <a key={item.path} href={routeFor(item.path)} className={`nav-link ${activePath === item.path ? 'active' : ''}`}>
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/5 text-xs font-semibold">
                  {item.label.slice(0, 1)}
                </span>
                <div>
                  <div className="font-medium">{item.label}</div>
                  <div className="text-xs text-slate-500">Training + monitoring</div>
                </div>
              </a>
            ))}
          </nav>
        </div>

        <div className="mt-auto">
          <button className="button-secondary w-full" onClick={onLogout}>
            Sign Out
          </button>
        </div>
      </aside>

      <div className="main-shell">
        <header className="topbar">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.24em] text-sky-300">Training Control</div>
            <h1 className="mt-2 text-3xl font-semibold">{title}</h1>
            <p className="mt-2 text-sm text-slate-400">{subtitle}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-slate-300">
            <div className="font-semibold text-slate-50">Scientist session</div>
            <div className="mt-1">Gateway + cookie auth preserved</div>
          </div>
        </header>
        <main className="content-area">
          <div className="page-stack">{children}</div>
        </main>
      </div>
    </div>
  );
}

function SectionCard({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="surface-card p-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <h2 className="text-2xl font-semibold">{title}</h2>
        {action}
      </div>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function LoginView({
  error,
  loading,
  onSubmit,
}: {
  error: string;
  loading: boolean;
  onSubmit: (event: FormEvent<HTMLFormElement>) => Promise<void>;
}) {
  return (
    <main className="login-shell">
      <div className="login-grid">
        <section className="login-card">
          <a href="/" className="inline-flex items-center gap-3" style={{ textDecoration: 'none', width: 'fit-content' }}>
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: 16,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'rgba(30, 201, 143, 0.12)',
                border: '1px solid rgba(30, 201, 143, 0.18)',
                boxShadow: '0 14px 30px rgba(30, 201, 143, 0.16)',
                flexShrink: 0,
              }}
            >
              <svg width="42" height="42" viewBox="0 0 42 42" xmlns="http://www.w3.org/2000/svg">
                <rect width="42" height="42" rx="12" fill="#0a2a1e" />
                <rect width="42" height="42" rx="12" fill="url(#scientistLoginLogoGrad)" opacity="0.7" />
                <defs>
                  <linearGradient id="scientistLoginLogoGrad" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#1ec98f" />
                    <stop offset="100%" stopColor="#0fa872" />
                  </linearGradient>
                </defs>
                <path d="M21 8 L32 13 L32 21 Q32 29 21 34 Q10 29 10 21 L10 13 Z" fill="none" stroke="#1ec98f" strokeWidth="1.5" strokeLinejoin="round" />
                <circle cx="21" cy="21" r="4" fill="#1ec98f" opacity="0.9" />
                <circle cx="21" cy="21" r="2" fill="#030d0a" />
                <circle cx="22.2" cy="19.8" r="0.8" fill="#1ec98f" />
              </svg>
            </div>
            <div>
              <div className="text-3xl font-semibold leading-none">
                <span style={{ color: '#1ec98f', fontWeight: 800 }}>IoT</span>
                <span style={{ color: '#b8d8f4', fontWeight: 400 }}>inel</span>
              </div>
              <div className="mt-1 text-xs font-semibold uppercase tracking-[0.28em] text-sky-300">Security Platform</div>
            </div>
          </a>
          <h1 className="mt-8 text-5xl font-semibold leading-tight">Train, compare, and promote models with confidence.</h1>
          <p className="mt-4 text-lg text-slate-300">
            Monitor drift, launch experiments, and manage promotion actions from one clean shell without touching the backend contracts.
          </p>
        </section>

        <section className="login-card">
          <div className="text-xs font-semibold uppercase tracking-[0.24em] text-sky-300">Sign In</div>
          <h2 className="mt-2 text-3xl font-semibold">Open the scientist workspace</h2>
          <form className="mt-8 space-y-4" onSubmit={onSubmit}>
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-200">Email</span>
              <input className="field" defaultValue="scientist@hexamind.local" name="email" />
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-200">Password</span>
              <input className="field" defaultValue="scientist123" name="password" type="password" />
            </label>
            {error ? <div className="inline-alert">{error}</div> : null}
            <button className="button-primary flex w-full items-center justify-center gap-3" disabled={loading} type="submit">
              {loading ? <span className="loading-dot" /> : null}
              {loading ? 'Signing in...' : 'Launch Scientist Console'}
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}

export default function App() {
  const location = useLocation();
  const navigate = useNavigate();
  const eventSourceRef = useRef<EventSource | null>(null);
  const pollTimerRef = useRef<number | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [user, setUser] = useState<AuthUser | null>(() => readStoredUser());
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [banner, setBanner] = useState('');
  const [error, setError] = useState('');
  const [datasets, setDatasets] = useState<DatasetRow[]>([]);
  const [dataset, setDataset] = useState('eMBB');
  const [params, setParams] = useState({ n_estimators: 300, learning_rate: 0.05, num_leaves: 63 });
  /** Additive model selector for the training console. */
  const [selectedModel, setSelectedModel] = useState<ModelOption>('xgboost');
  /** Stores hyperparameters per model without removing existing params state. */
  const [modelHyperparameters, setModelHyperparameters] = useState<ModelHyperparameters>(DEFAULT_MODEL_HYPERPARAMETERS);
  /** Optional dataset sampling limit; blank keeps the current full-dataset behavior. */
  const [numRows, setNumRows] = useState('');
  const [numRowsError, setNumRowsError] = useState('');
  /** Locks the full training console while a run or train-all sequence is active. */
  const [isTrainingBusy, setIsTrainingBusy] = useState(false);
  /** Shows train-all progress below the action buttons. */
  const [trainAllProgress, setTrainAllProgress] = useState<TrainAllProgress | null>(null);
  const [runId, setRunId] = useState('');
  const [logs, setLogs] = useState<string[]>([]);
  const [runs, setRuns] = useState<TrainRun[]>([]);
  const [drift, setDrift] = useState<Record<string, unknown>>({});
  const [elk, setElk] = useState<Record<string, unknown>>({});

  const currentPath = useMemo(() => normalizePath(location.pathname), [location.pathname]);
  const isLoginPage = currentPath === '/' || currentPath === LOGIN_PATH;
  const activePage = isLoginPage ? ROLE_CONFIG.homePath : currentPath;
  const visibleHyperparameterFields = MODEL_FIELD_CONFIG[selectedModel];
  const activeHyperparameters = modelHyperparameters[selectedModel];
  const inputsDisabled = isTrainingBusy;

  const loadProtectedData = async () => {
    setLoading(true);
    const [datasetPayload, runPayload, driftPayload, healthPayload] = await Promise.all([
      api<{ datasets: DatasetRow[] }>('/train/datasets'),
      api<TrainRun[]>('/train/runs'),
      api<Record<string, unknown>>('/monitor/drift'),
      api<Record<string, unknown>>('/monitor/health'),
    ]);
    setDatasets(Array.isArray(datasetPayload.datasets) ? datasetPayload.datasets : []);
    setRuns(Array.isArray(runPayload) ? runPayload : []);
    setDrift(driftPayload);
    setElk((healthPayload.elk || {}) as Record<string, unknown>);
    if (Array.isArray(datasetPayload.datasets) && datasetPayload.datasets[0] && !datasetPayload.datasets.some((item) => item.dataset === dataset)) {
      setDataset(datasetPayload.datasets[0].dataset);
    }
    setLoading(false);
  };

  const handleUnauthorized = (message: string) => {
    writeStoredUser(null);
    setUser(null);
    setLoginError(message);
    window.location.href = GATEWAY_LOGIN_URL;
  };

  const stopTrainingPolling = () => {
    if (pollTimerRef.current !== null) {
      window.clearTimeout(pollTimerRef.current);
      pollTimerRef.current = null;
    }
  };

  const refreshRuns = async () => {
    const refreshed = await api<TrainRun[]>('/train/runs');
    setRuns(refreshed);
  };

  /** Builds the current training payload while preserving the existing request contract. */
  const buildTrainingRequest = (datasetName: string) => {
    const hyperparameters = Object.fromEntries(
      visibleHyperparameterFields.map((field) => [field.key, parseHyperparameterValue(field, activeHyperparameters[field.key])]),
    );
    const normalizedHyperparameters = selectedModel === 'lightgbm'
      ? { ...hyperparameters, ...params }
      : hyperparameters;
    const payload: Record<string, unknown> = {
      dataset: datasetName,
      model_type: selectedModel,
      model: selectedModel,
      hyperparameters: normalizedHyperparameters,
    };
    const parsedNumRows = parseNumRowsValue(numRows);
    if (parsedNumRows) {
      payload.num_rows = parsedNumRows;
    }
    return payload;
  };

  const validateNumRows = () => {
    if (!numRows.trim() || numRows.trim() === '0') {
      setNumRowsError('');
      return true;
    }
    if (parseNumRowsValue(numRows) === null) {
      setNumRowsError('Number of Rows must be a positive integer.');
      return false;
    }
    setNumRowsError('');
    return true;
  };

  /** Starts one training run and streams logs into the existing log panel. */
  const runTrainingSession = async (datasetName: string, options?: { appendLogs?: boolean }) => {
    const appendLogs = options?.appendLogs ?? false;
    const payload = await api<{ run_id: string }>('/train/start', {
      method: 'POST',
      body: JSON.stringify(buildTrainingRequest(datasetName)),
    });

    setRunId(payload.run_id);
    if (!appendLogs) {
      setLogs([]);
    }

    await new Promise<void>((resolve, reject) => {
      eventSourceRef.current?.close();
      const source = new EventSource(`${API_BASE}/train/logs/${payload.run_id}`, { withCredentials: true });
      eventSourceRef.current = source;

      source.onmessage = (streamEvent) => setLogs((current) => [...current, streamEvent.data]);
      source.addEventListener('done', async () => {
        stopTrainingPolling();
        source.close();
        await refreshRuns();
        resolve();
      });
      source.addEventListener('error', () => {
        source.close();
        void (async () => {
          try {
            const snapshot = await api<TrainLogSnapshot>('/train/logs_snapshot/' + payload.run_id);
            if (snapshot.logs?.length) {
              setLogs((current) => (appendLogs ? [...current, ...snapshot.logs] : snapshot.logs));
            }
            if (snapshot.status === 'failed') {
              reject(new Error(snapshot.error || 'Training failed.'));
              return;
            }
            if (snapshot.status !== 'completed') {
              reject(new Error('Training stream interrupted before completion.'));
              return;
            }
            await refreshRuns();
            resolve();
          } catch (err) {
            reject(err);
          }
        })();
      });
    });
  };

  const syncTrainingSnapshot = async (activeRunId: string) => {
    try {
      const snapshot = await api<TrainLogSnapshot>('/train/logs_snapshot/' + activeRunId);
      setLogs(snapshot.logs || []);
      if (snapshot.status === 'completed') {
        stopTrainingPolling();
        setBanner('Training completed. Run history refreshed.');
        await refreshRuns();
        return;
      }
      if (snapshot.status === 'failed') {
        stopTrainingPolling();
        setError(snapshot.error || 'Training failed.');
        return;
      }
      pollTimerRef.current = window.setTimeout(() => {
        void syncTrainingSnapshot(activeRunId);
      }, 3000);
    } catch (err) {
      const message = (err as Error).message;
      if (isAuthError(message)) {
        handleUnauthorized(message);
        return;
      }
      stopTrainingPolling();
      setError(message);
    }
  };

  useEffect(() => {
    const storedUser = readStoredUser();
    if (storedUser && storedUser.role !== ROLE_CONFIG.role) {
      window.location.href = redirectForRole(storedUser.role);
      return;
    }
    if (isLoginPage) {
      setAuthReady(true);
      setLoading(false);
      return;
    }
    loadProtectedData()
      .then(() => {
        setError('');
        setAuthReady(true);
      })
      .catch((err: Error) => {
        if (isAuthError(err.message)) {
          handleUnauthorized(err.message);
          return;
        }
        setError(err.message);
        setLoading(false);
        setAuthReady(true);
      });
    return () => {
      eventSourceRef.current?.close();
      stopTrainingPolling();
    };
  }, [isLoginPage]);

  const submitLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const email = String(form.get('email') || '').trim();
    const password = String(form.get('password') || '');
    setLoginError('');
    setLoginLoading(true);
    try {
      const payload = await api<AuthResponse>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      writeStoredUser(payload.user);
      setUser(payload.user);
      if (payload.user.role !== ROLE_CONFIG.role) {
        window.location.href = redirectForRole(payload.user.role);
        return;
      }
      navigate(HOME_PATH, { replace: true });
    } catch (err) {
      setLoginError((err as Error).message);
    } finally {
      setLoginLoading(false);
    }
  };

  const logout = () => {
    writeStoredUser(null);
    setUser(null);
    window.location.href = GATEWAY_LOGIN_URL;
  };

  const startTraining = async () => {
    setBanner('');
    setError('');
    stopTrainingPolling();
    if (!validateNumRows()) {
      return;
    }
    setIsTrainingBusy(true);
    try {
      await runTrainingSession(dataset);
      setBanner('Training completed. Run history refreshed.');
      navigate(routeFor('/training'));
    } catch (err) {
      const message = (err as Error).message;
      if (isAuthError(message)) {
        handleUnauthorized(message);
        return;
      }
      setError(message);
    } finally {
      setIsTrainingBusy(false);
    }
  };

  /** Sequentially trains every available dataset with the currently selected settings. */
  const trainAllDatasets = async () => {
    setBanner('');
    setError('');
    stopTrainingPolling();
    if (!validateNumRows()) {
      return;
    }
    const availableDatasets = datasets.map((item) => item.dataset);
    if (!availableDatasets.length) {
      setError('No datasets available for training.');
      return;
    }
    setLogs([]);
    setIsTrainingBusy(true);
    try {
      for (const [index, datasetName] of availableDatasets.entries()) {
        setTrainAllProgress({ current: index + 1, total: availableDatasets.length });
        setLogs((current) => [...current, `═══ Training on dataset: ${datasetName} ═══`]);
        try {
          await runTrainingSession(datasetName, { appendLogs: true });
        } catch (err) {
          setLogs((current) => [...current, `Training error for ${datasetName}: ${(err as Error).message}`]);
        }
      }
      setLogs((current) => [...current, '✓ All datasets trained.']);
      setBanner('All datasets finished training.');
      await refreshRuns();
    } finally {
      setTrainAllProgress(null);
      setIsTrainingBusy(false);
    }
  };

  const promoteRun = async (value: string) => {
    try {
      const payload = await api<{ message: string }>('/train/promote/' + value, { method: 'POST' });
      setBanner(payload.message);
      const refreshed = await api<TrainRun[]>('/train/runs');
      setRuns(refreshed);
    } catch (err) {
      const message = (err as Error).message;
      if (isAuthError(message)) {
        handleUnauthorized(message);
        return;
      }
      setError(message);
    }
  };

  const driftDatasets = Object.entries(drift);
  const stableCount = driftDatasets.filter(([, payload]) => {
    const record = payload as { should_retrain?: { should_retrain?: boolean } };
    return !record.should_retrain?.should_retrain;
  }).length;
  const retrainCount = driftDatasets.length - stableCount;
  const datasetAccuracySeries = useMemo(() => {
    const palette = ['#60a5fa', '#34d399', '#f59e0b', '#f472b6', '#a78bfa', '#22d3ee'];
    const grouped = new Map<string, number[]>();
    runs
      .slice()
      .reverse()
      .forEach((run) => {
        const label = String(run.dataset || 'Unknown');
        const next = grouped.get(label) ?? [];
        next.push(Number(run.accuracy || 0) * 100);
        grouped.set(label, next);
      });
    return Array.from(grouped.entries()).map(([label, points], index) => ({
      label,
      points,
      color: palette[index % palette.length],
    }));
  }, [runs]);
  const topRuns = runs
    .slice()
    .sort((left, right) => Number(right.f1 || 0) - Number(left.f1 || 0))
    .slice(0, 5)
    .map((run) => ({ label: String(run.dataset), value: Number(run.f1 || 0) }));
  const datasetVolume = datasets.map((item) => ({ label: item.dataset, value: item.rows }));
  const averageAuc = runs.length ? runs.reduce((sum, run) => sum + Number(run.auc || 0), 0) / runs.length : 0;
  const pageCopy: Record<string, { title: string; subtitle: string }> = {
    '/monitoring': {
      title: 'Monitoring Overview',
      subtitle: 'Review drift and ELK health before triggering retraining decisions.',
    },
    '/training': {
      title: 'Training Console',
      subtitle: 'Launch new runs and stream logs without leaving the page.',
    },
    '/model-comparison': {
      title: 'Run Comparison',
      subtitle: 'Compare metrics and promotion options for recent training runs.',
    },
    '/drift-metrics': {
      title: 'Drift Metrics',
      subtitle: 'Inspect retraining signals dataset by dataset.',
    },
    '/shap-explanations': {
      title: 'SHAP Readiness',
      subtitle: 'Review dataset feature sets used for explanations.',
    },
    '/swagger': {
      title: 'API References',
      subtitle: 'Quick access to training, monitoring, and MLflow surfaces.',
    },
  };
  const currentCopy = pageCopy[activePage] || pageCopy['/monitoring'];

  if (!authReady && !isLoginPage) {
    return (
      <main className="login-shell">
        <div className="login-card flex items-center gap-4">
          <span className="loading-dot" />
          <div>
            <div className="text-lg font-semibold">Loading scientist workspace</div>
            <div className="mt-1 text-sm text-slate-400">Restoring training session and drift context.</div>
          </div>
        </div>
      </main>
    );
  }

  if (isLoginPage) {
    return <LoginView error={loginError} loading={loginLoading} onSubmit={submitLogin} />;
  }

  return (
    <Shell activePath={activePage} onLogout={logout} subtitle={currentCopy.subtitle} title={currentCopy.title} user={user}>
      {banner ? <div className="status-pill success">{banner}</div> : null}
      {error ? <div className="inline-alert">{error}</div> : null}

      {activePage === '/monitoring' ? (
        <div className="page-stack">
          <div className="insight-grid">
            <StatTile label="Datasets Monitored" value={String(driftDatasets.length)} hint="Active drift targets" />
            <StatTile label="Stable" value={String(stableCount)} hint="No retrain signal" />
            <StatTile label="Retrain Alerts" value={String(retrainCount)} hint={retrainCount > 0 ? 'Action recommended' : 'All clear'} />
            <StatTile label="ELK Health" value={String(elk.reachable ?? elk.enabled ?? 'unknown')} hint="Elasticsearch + Kibana" />
          </div>

          <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
            <SectionCard
              title="Dataset Drift Status"
              action={
                <span className={`status-pill ${retrainCount > 0 ? 'danger' : 'success'}`}>
                  {retrainCount > 0 ? `${retrainCount} alert${retrainCount > 1 ? 's' : ''}` : 'All stable'}
                </span>
              }
            >
              {loading ? (
                <div className="h-64 rounded-2xl skeleton" />
              ) : (
                <div className="space-y-3">
                  {driftDatasets.map(([name, payload]) => {
                    const record = payload as {
                      should_retrain?: { should_retrain?: boolean; reason?: string };
                      feature_drift?: Record<string, unknown>;
                    };
                    const needsRetrain = record.should_retrain?.should_retrain ?? false;
                    const numericVals = Object.values(record.feature_drift ?? {})
                      .map((v) => parseFloat(String(v)))
                      .filter((v) => !isNaN(v));
                    const avgDrift = numericVals.length
                      ? numericVals.reduce((a, b) => a + b, 0) / numericVals.length
                      : 0;
                    const driftPct = Math.min(avgDrift * 100, 100);
                    return (
                      <div key={name} className="surface-soft p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="h-2.5 w-2.5 rounded-full flex-shrink-0" style={{ background: needsRetrain ? '#f87171' : '#34d399' }} />
                            <strong>{name}</strong>
                          </div>
                          <span className={`status-pill ${needsRetrain ? 'danger' : 'success'}`}>
                            {needsRetrain ? 'Retrain' : 'Stable'}
                          </span>
                        </div>
                        <div>
                          <div className="flex justify-between text-xs text-slate-400 mb-1">
                            <span>Avg feature drift</span>
                            <span>{driftPct.toFixed(1)}%</span>
                          </div>
                          <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all"
                              style={{
                                width: `${driftPct}%`,
                                background:
                                  driftPct > 60
                                    ? 'linear-gradient(90deg,#f87171,#ef4444)'
                                    : driftPct > 30
                                    ? 'linear-gradient(90deg,#fbbf24,#f59e0b)'
                                    : 'linear-gradient(90deg,#34d399,#10b981)',
                              }}
                            />
                          </div>
                        </div>
                        {record.should_retrain?.reason && (
                          <p className="text-xs text-slate-400 leading-relaxed">{record.should_retrain.reason}</p>
                        )}
                      </div>
                    );
                  })}
                  {driftDatasets.length === 0 && <div className="empty-state">No drift data available yet.</div>}
                </div>
              )}
            </SectionCard>

            <div className="space-y-6">
              <SectionCard title="ELK Health">
                {loading ? (
                  <div className="h-32 rounded-2xl skeleton" />
                ) : Object.entries(elk).length === 0 ? (
                  <div className="empty-state">ELK data unavailable.</div>
                ) : (
                  <div className="space-y-2">
                    {Object.entries(elk).map(([key, value]) => {
                      const isOk = value === true || value === 'true' || value === 'ok' || value === 'green';
                      const isWarn = value === 'yellow' || value === 'warn';
                      return (
                        <div key={key} className="flex items-center justify-between surface-soft px-4 py-3">
                          <span className="text-sm text-slate-300 capitalize">{key.replace(/_/g, ' ')}</span>
                          <span className={`status-pill ${isOk ? 'success' : isWarn ? 'warning' : 'danger'}`}>
                            {String(value)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </SectionCard>

              <SectionCard title="Dataset Volume">
                {loading ? (
                  <div className="h-48 rounded-2xl skeleton" />
                ) : (
                  <div className="space-y-3">
                    <MiniAreaChart points={datasetVolume.map((item) => item.value)} title="Row Distribution" xAxisLabel="Dataset Index" yAxisLabel="Rows" />
                    <SparkBars items={datasetVolume} tone="sky" />
                  </div>
                )}
              </SectionCard>
            </div>
          </section>

          {runs.length > 0 && (
            <SectionCard title="Recent Training Accuracy">
              <MultiSeriesAccuracyChart
                series={datasetAccuracySeries}
                title="Accuracy Curve by Dataset"
                xAxisLabel="Training Run per Dataset"
                yAxisLabel="Accuracy (%)"
              />
            </SectionCard>
          )}
        </div>
      ) : null}

      {activePage === '/drift-metrics' ? (
        <section className="grid gap-6 lg:grid-cols-[1fr_1fr]">
          <SectionCard title="Monitoring Panel" action={<div className="status-pill success">ELK: {String(elk.reachable ?? elk.enabled ?? 'unknown')}</div>}>
            {loading ? (
              <div className="h-64 rounded-2xl skeleton" />
            ) : (
              <div className="space-y-4">
                <div className="insight-grid">
                  <StatTile label="Stable Datasets" value={String(stableCount)} hint="No retrain signal" />
                  <StatTile label="Retrain Alerts" value={String(retrainCount)} hint="Drift-based triggers" />
                </div>
                <SparkBars
                  items={driftDatasets.map(([name, payload]) => {
                    const record = payload as { should_retrain?: { should_retrain?: boolean } };
                    return { label: name, value: record.should_retrain?.should_retrain ? 1 : 0.25 };
                  })}
                  tone="amber"
                />
                {driftDatasets.map(([name, payload]) => {
                  const record = payload as {
                    should_retrain?: { should_retrain?: boolean; reason?: string };
                    performance_drift?: Record<string, unknown>;
                    feature_drift?: Record<string, unknown>;
                  };
                  return (
                    <div key={name} className="surface-soft p-4">
                      <div className="flex items-center justify-between">
                        <strong>{name}</strong>
                        <span className={`status-pill ${record.should_retrain?.should_retrain ? 'danger' : 'success'}`}>
                          {record.should_retrain?.should_retrain ? 'Retrain' : 'Stable'}
                        </span>
                      </div>
                      <div className="mt-2 text-sm text-slate-300">{record.should_retrain?.reason || 'No active retraining trigger.'}</div>
                      <div className="mt-2 text-xs text-slate-400">Feature drift: {JSON.stringify(record.feature_drift).slice(0, 180)}</div>
                      <div className="mt-2 text-xs text-slate-400">Performance drift: {JSON.stringify(record.performance_drift).slice(0, 180)}</div>
                    </div>
                  );
                })}
              </div>
            )}
          </SectionCard>

          <SectionCard title="Dataset Catalog">
            {loading ? (
              <div className="h-64 rounded-2xl skeleton" />
            ) : (
              <div className="space-y-4">
                <MiniAreaChart
                  points={datasetVolume.map((item) => item.value)}
                  title="Dataset Size Distribution"
                  xAxisLabel="Dataset Index"
                  yAxisLabel="Number of Rows"
                />
                <SparkBars items={datasetVolume} tone="sky" />
                {datasets.map((item) => (
                  <div key={item.dataset} className="surface-soft p-4">
                    <div className="flex items-center justify-between">
                      <strong>{item.dataset}</strong>
                      <span className="status-pill warning">{item.rows.toLocaleString()} rows</span>
                    </div>
                    <div className="mt-2 text-sm text-slate-300">{item.feature_list.join(', ')}</div>
                    <div className="mt-2 text-xs text-slate-400">
                      Balance: {Object.entries(item.class_balance).map(([label, value]) => `${label} ${(value * 100).toFixed(1)}%`).join(' / ')}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>
        </section>
      ) : null}

      {activePage === '/training' ? (
        <SectionCard title="Training Panel" action={<div className="status-pill warning">{dataset}</div>}>
          <div className="insight-grid mb-5">
            <StatTile label="Tracked Runs" value={String(runs.length)} hint="Current experiment backlog" />
            <StatTile label="Average AUC" value={averageAuc.toFixed(4)} hint="Across visible runs" />
            <StatTile label="Active Dataset" value={dataset} hint="Selected training source" />
          </div>
          <select className="field" disabled={inputsDisabled} value={dataset} onChange={(event) => setDataset(event.target.value)}>
            {datasets.map((item) => <option key={item.dataset}>{item.dataset}</option>)}
          </select>
          {/* Additive model selector with dynamic per-model hyperparameters. */}
          <div className="mt-5">
            <label className="mb-2 block text-sm font-medium text-slate-300">Model</label>
            <select
              className="field"
              disabled={inputsDisabled}
              value={selectedModel}
              onChange={(event) => {
                const nextModel = event.target.value as ModelOption;
                setSelectedModel(nextModel);
                if (nextModel === 'lightgbm') {
                  setParams({
                    n_estimators: Number(modelHyperparameters.lightgbm.n_estimators),
                    learning_rate: Number(modelHyperparameters.lightgbm.learning_rate),
                    num_leaves: Number(modelHyperparameters.lightgbm.num_leaves),
                  });
                }
              }}
            >
              {MODEL_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </div>
          <div className="mt-5 grid gap-3 md:grid-cols-3">
            {visibleHyperparameterFields.map((field) => (
              <div key={field.key}>
                <label className="mb-2 block text-sm font-medium text-slate-300">{field.label}</label>
                {field.type === 'select' ? (
                  <select
                    className="field"
                    disabled={inputsDisabled}
                    value={String(activeHyperparameters[field.key])}
                    onChange={(event) => {
                      const value = event.target.value;
                      setModelHyperparameters((current) => ({
                        ...current,
                        [selectedModel]: {
                          ...current[selectedModel],
                          [field.key]: value,
                        },
                      }));
                    }}
                  >
                    {field.options.map((option) => <option key={option} value={option}>{option}</option>)}
                  </select>
                ) : (
                  <input
                    className="field"
                    disabled={inputsDisabled}
                    placeholder={field.placeholder}
                    step={field.step}
                    type={field.type}
                    value={String(activeHyperparameters[field.key])}
                    onChange={(event) => {
                      const nextValue = field.type === 'number' ? Number(event.target.value) : event.target.value;
                      setModelHyperparameters((current) => ({
                        ...current,
                        [selectedModel]: {
                          ...current[selectedModel],
                          [field.key]: nextValue,
                        },
                      }));
                      if (selectedModel === 'lightgbm') {
                        setParams((current) => ({
                          ...current,
                          [field.key]: field.type === 'number' ? Number(event.target.value) : event.target.value,
                        }));
                      }
                    }}
                  />
                )}
              </div>
            ))}
            {/* Optional row sampler control. Blank or zero preserves the existing backend behavior. */}
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-300">Number of Rows</label>
              <input
                className="field"
                disabled={inputsDisabled}
                min={1}
                placeholder="All rows"
                type="number"
                value={numRows}
                onBlur={validateNumRows}
                onChange={(event) => {
                  setNumRows(event.target.value);
                  if (numRowsError) {
                    setNumRowsError('');
                  }
                }}
              />
              <div className="mt-2 text-xs text-slate-500">Max rows to sample from dataset (leave blank = full dataset)</div>
              {numRowsError ? <div className="mt-2 text-xs text-rose-300">{numRowsError}</div> : null}
            </div>
          </div>
          <div className="mt-5 flex flex-col gap-3 md:flex-row md:items-start">
            <button className="button-primary" disabled={inputsDisabled} onClick={startTraining}>
              Start Training
            </button>
            <button className="button-secondary" disabled={inputsDisabled} onClick={trainAllDatasets}>
              Train All Datasets
            </button>
          </div>
          {trainAllProgress ? (
            <p className="mt-3 text-sm text-slate-400">
              Training dataset {trainAllProgress.current} / {trainAllProgress.total}
            </p>
          ) : null}
          {runId ? <p className="mt-4 text-sm text-slate-400">Active run: {runId}</p> : null}
          {runs.length ? (
            <div className="mt-5 surface-soft p-4">
              <MultiSeriesAccuracyChart
                series={datasetAccuracySeries}
                title="Accuracy Curve by Dataset"
                xAxisLabel="Training Run per Dataset"
                yAxisLabel="Accuracy (%)"
              />
            </div>
          ) : null}
          <div className="mt-5 max-h-72 overflow-auto rounded-2xl border border-white/10 bg-black/30 p-4 font-mono text-xs">
            {logs.length ? logs.map((line, index) => <div key={index}>{line}</div>) : <div className="text-slate-500">Streaming logs will appear here after training starts.</div>}
          </div>
        </SectionCard>
      ) : null}

      {activePage === '/model-comparison' ? (
        <SectionCard title="Model Comparison Table">
          {topRuns.length ? (
            <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr] mb-6">
              <div className="surface-soft p-4">
                <div className="mb-3 text-sm font-semibold text-slate-200">F1 Leaderboard</div>
                <SparkBars items={topRuns} tone="emerald" />
              </div>
              <div className="surface-soft p-4">
                <MultiSeriesAccuracyChart
                  series={datasetAccuracySeries}
                  title="Accuracy Curve by Dataset"
                  xAxisLabel="Training Run per Dataset"
                  yAxisLabel="Accuracy (%)"
                />
              </div>
            </div>
          ) : null}
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Run ID</th>
                  <th>Dataset</th>
                  <th>Accuracy</th>
                  <th>F1</th>
                  <th>AUC</th>
                  <th>Created</th>
                  <th>Registry</th>
                </tr>
              </thead>
              <tbody>
                {runs.length ? (
                  runs.map((run) => (
                    <tr key={run.run_id}>
                      <td>{run.run_id}</td>
                      <td>{run.dataset}</td>
                      <td>{Number(run.accuracy || 0).toFixed(4)}</td>
                      <td>{Number(run.f1 || 0).toFixed(4)}</td>
                      <td>{Number(run.auc || 0).toFixed(4)}</td>
                      <td>{run.created_at || 'n/a'}</td>
                      <td>
                        <button className="button-secondary" onClick={() => promoteRun(run.run_id)}>
                          Promote
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7}>
                      <div className="empty-state">No training runs yet. Start a run from the training page.</div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </SectionCard>
      ) : null}

      {activePage === '/shap-explanations' ? (
        <SectionCard title="SHAP Readiness">
          <div className="space-y-3">
            {datasets.map((item) => (
              <div key={item.dataset} className="surface-soft p-4">
                <strong>{item.dataset}</strong>
                <div className="mt-2 text-sm text-slate-300">Feature set used for explanation-ready inference:</div>
                <div className="mt-2 text-xs text-slate-400">{item.feature_list.join(', ')}</div>
              </div>
            ))}
          </div>
        </SectionCard>
      ) : null}

      {activePage === '/swagger' ? (
        <section className="grid gap-4 md:grid-cols-3">
          <a className="surface-card p-6 transition-transform duration-150 hover:-translate-y-1" href="http://localhost:8003/docs" rel="noreferrer" target="_blank">Training Swagger</a>
          <a className="surface-card p-6 transition-transform duration-150 hover:-translate-y-1" href="http://localhost:8004/docs" rel="noreferrer" target="_blank">Monitoring Swagger</a>
          <a className="surface-card p-6 transition-transform duration-150 hover:-translate-y-1" href="http://localhost:5000" rel="noreferrer" target="_blank">MLflow UI</a>
        </section>
      ) : null}
    </Shell>
  );
}
