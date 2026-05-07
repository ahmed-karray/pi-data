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

function MiniAreaChart({ points }: { points: number[] }) {
  if (!points.length) {
    return <div className="empty-state">No chart data available yet.</div>;
  }
  const width = 360;
  const height = 120;
  const max = Math.max(...points, 1);
  const step = points.length > 1 ? width / (points.length - 1) : width;
  const coords = points.map((value, index) => {
    const x = index * step;
    const y = height - (value / max) * (height - 14) - 7;
    return `${x},${y}`;
  });
  const polyline = coords.join(' ');
  const area = `0,${height} ${polyline} ${width},${height}`;
  return (
    <svg className="mini-area-chart" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
      <polygon points={area} className="mini-area-fill" />
      <polyline points={polyline} className="mini-area-line" />
    </svg>
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
          <div className="inline-flex items-center gap-3">
            <div className="brand-mark">S</div>
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.28em] text-sky-300">Scientist Console</div>
              <div className="text-lg font-semibold">Training and Drift Oversight</div>
            </div>
          </div>
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
  const runAccuracyTrend = runs.slice(0, 8).reverse().map((run) => Number(run.accuracy || 0) * 100);
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

      {(activePage === '/monitoring' || activePage === '/drift-metrics') ? (
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
                <MiniAreaChart points={datasetVolume.map((item) => item.value)} />
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
              <div className="mb-3 text-sm font-semibold text-slate-200">Recent Accuracy Trend</div>
              <MiniAreaChart points={runAccuracyTrend} />
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
                <div className="mb-3 text-sm font-semibold text-slate-200">Run Accuracy Curve</div>
                <MiniAreaChart points={runAccuracyTrend} />
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
