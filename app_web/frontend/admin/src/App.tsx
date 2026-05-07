import { FormEvent, ReactNode, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ROLE_CONFIG, SupportedRole } from './role';

type AdminUser = {
  id: number;
  full_name: string;
  email: string;
  role: string;
  status: string;
  is_active?: boolean;
};
type PendingRequest = {
  id: number;
  full_name: string;
  email: string;
  role: string;
  created_at?: string;
};
type AdminSettings = {
  detection_threshold: number;
  alert_frequency: string;
  auto_retrain: boolean;
  system_retention_days: number;
  notification_channels: string[];
};
type TrainRun = Record<string, unknown>;
type HealthRow = Record<string, unknown>;
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
type StatTileProps = {
  label: string;
  value: string;
  hint?: string;
};

const API_BASE = 'http://localhost:8010';
const GATEWAY_LOGIN_URL = `${API_BASE}/login`;
const STORAGE_KEY = 'iotinel_user_session';
const IS_GATEWAY = window.location.port === '8010';
const APP_PREFIX = IS_GATEWAY ? '/administrator' : '';
const LOGIN_PATH = '/login';
const HOME_PATH = `${APP_PREFIX}${ROLE_CONFIG.homePath}`;

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
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

function SparkBars({ items, tone = 'amber' }: { items: Array<{ label: string; value: number }>; tone?: 'amber' | 'emerald' | 'rose' }) {
  const max = Math.max(...items.map((item) => item.value), 1);
  return (
    <div className="spark-bars">
      {items.map((item) => (
        <div key={item.label} className="spark-row">
          <div className="spark-meta">
            <span>{item.label}</span>
            <strong>{item.value}</strong>
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
  const navItems = [
    { path: '/dashboard', label: 'Dashboard' },
    { path: '/platform', label: 'Platform' },
    { path: '/user-management', label: 'Users' },
    { path: '/access-requests', label: 'Requests' },
    { path: '/settings', label: 'Settings' },
    { path: '/training', label: 'Training' },
    { path: '/swagger', label: 'Swagger' },
  ];

  return (
    <div className="app-shell">
      <aside className="app-sidebar">
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="brand-mark">A</div>
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.28em] text-amber-300">IOTinel</div>
              <div className="text-lg font-semibold">Admin Workspace</div>
            </div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-stone-950/70 p-4">
            <div className="text-sm font-semibold">{user?.full_name || 'Administrator'}</div>
            <div className="mt-1 text-sm text-stone-400">{user?.email || 'signed in'}</div>
            <div className="mt-3 status-pill success">Role: Admin</div>
          </div>
        </div>

        <div>
          <div className="sidebar-section-label">Control Center</div>
          <nav className="space-y-2">
            {navItems.map((item) => (
              <a key={item.path} href={routeFor(item.path)} className={`nav-link ${activePath === item.path ? 'active' : ''}`}>
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/5 text-xs font-semibold">
                  {item.label.slice(0, 1)}
                </span>
                <div>
                  <div className="font-medium">{item.label}</div>
                  <div className="text-xs text-stone-500">Admin route</div>
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
            <div className="text-xs font-semibold uppercase tracking-[0.24em] text-amber-300">Platform Governance</div>
            <h1 className="mt-2 text-3xl font-semibold">{title}</h1>
            <p className="mt-2 text-sm text-stone-400">{subtitle}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-stone-950/70 px-4 py-3 text-sm text-stone-300">
            <div className="font-semibold text-stone-50">Admin session</div>
            <div className="mt-1">Gateway-safe, reload-safe</div>
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
            <div className="brand-mark">A</div>
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.28em] text-amber-300">Administrator Console</div>
              <div className="text-lg font-semibold">Unified Platform Control</div>
            </div>
          </div>
          <h1 className="mt-8 text-5xl font-semibold leading-tight">Govern users, health, and operations from one polished control surface.</h1>
          <p className="mt-4 text-lg text-stone-300">
            Review platform status, manage user access, and supervise training promotion workflows without altering the backend integration.
          </p>
        </section>

        <section className="login-card">
          <div className="text-xs font-semibold uppercase tracking-[0.24em] text-amber-300">Sign In</div>
          <h2 className="mt-2 text-3xl font-semibold">Open the admin workspace</h2>
          <form className="mt-8 space-y-4" onSubmit={onSubmit}>
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-stone-200">Email</span>
              <input className="field" defaultValue="admin@hexamind.local" name="email" />
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-stone-200">Password</span>
              <input className="field" defaultValue="admin123" name="password" type="password" />
            </label>
            {error ? <div className="inline-alert">{error}</div> : null}
            <button className="button-primary flex w-full items-center justify-center gap-3" disabled={loading} type="submit">
              {loading ? <span className="loading-dot" /> : null}
              {loading ? 'Signing in...' : 'Launch Admin Console'}
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
  const [authReady, setAuthReady] = useState(false);
  const [user, setUser] = useState<AuthUser | null>(() => readStoredUser());
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [summary, setSummary] = useState<Record<string, unknown>>({});
  const [runs, setRuns] = useState<TrainRun[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [health, setHealth] = useState<HealthRow[]>([]);
  const [requests, setRequests] = useState<PendingRequest[]>([]);
  const [settings, setSettings] = useState<AdminSettings>({
    detection_threshold: 85,
    alert_frequency: 'Real-time',
    auto_retrain: true,
    system_retention_days: 30,
    notification_channels: ['Email', 'Slack'],
  });

  const currentPath = useMemo(() => normalizePath(location.pathname), [location.pathname]);
  const isLoginPage = currentPath === '/' || currentPath === LOGIN_PATH;
  const activePage = isLoginPage ? ROLE_CONFIG.homePath : currentPath;

  const load = async () => {
    setLoading(true);
    const [summaryPayload, runPayload, userPayload, healthPayload, requestPayload, settingsPayload] = await Promise.all([
      api<Record<string, unknown>>('/dashboard/summary'),
      api<Array<Record<string, unknown>>>('/train/runs'),
      api<AdminUser[]>('/admin/users'),
      api<{ services: Array<Record<string, unknown>> }>('/admin/health'),
      api<PendingRequest[]>('/admin/requests'),
      api<AdminSettings>('/admin/settings'),
    ]);
    setSummary(summaryPayload);
    setRuns(Array.isArray(runPayload) ? runPayload : []);
    setUsers(Array.isArray(userPayload) ? userPayload : []);
    setHealth(Array.isArray(healthPayload.services) ? healthPayload.services : []);
    setRequests(Array.isArray(requestPayload) ? requestPayload : []);
    setSettings(settingsPayload);
    setLoading(false);
  };

  const handleUnauthorized = (message: string) => {
    writeStoredUser(null);
    setUser(null);
    setLoginError(message);
    window.location.href = GATEWAY_LOGIN_URL;
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
    load()
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

  const reloadAfterMutation = async (successMessage: string) => {
    setMessage(successMessage);
    await load();
  };

  const wrapMutation = async (action: () => Promise<void>) => {
    try {
      await action();
    } catch (err) {
      const text = (err as Error).message;
      if (isAuthError(text)) {
        handleUnauthorized(text);
        return;
      }
      setError(text);
    }
  };

  const summaryRows = Array.isArray(summary.summary) ? (summary.summary as Array<Record<string, unknown>>) : [];
  const activeUsers = users.filter((managedUser) => managedUser.is_active !== false).length;
  const pendingUsers = users.filter((managedUser) => managedUser.status === 'pending').length;
  const roleCounts = ['security_analyst', 'data_scientist', 'administrator'].map((role) => ({
    label: role,
    value: users.filter((managedUser) => managedUser.role === role).length,
  }));
  const healthCounts = {
    up: health.filter((row) => String(row.status || '').toUpperCase() === 'UP').length,
    down: health.filter((row) => String(row.status || '').toUpperCase() !== 'UP').length,
  };
  const latencyTrend = health.map((row) => {
    const raw = String(row.latency || row.uptime_percent || 0);
    const numeric = Number.parseFloat(raw.replace(/[^\d.]/g, ''));
    return Number.isFinite(numeric) ? numeric : 0;
  });
  const topTrainingRuns = runs
    .slice()
    .sort((left, right) => Number(right.f1 || 0) - Number(left.f1 || 0))
    .slice(0, 5)
    .map((run) => ({ label: String(run.dataset || run.run_id || 'run'), value: Number(run.f1 || 0) }));

  const pageCopy: Record<string, { title: string; subtitle: string }> = {
    '/dashboard': {
      title: 'Executive Overview',
      subtitle: 'Cross-check platform activity, training throughput, and managed user volume.',
    },
    '/platform': {
      title: 'Platform Health',
      subtitle: 'Review service latency and availability from the admin perspective.',
    },
    '/user-management': {
      title: 'User Management',
      subtitle: 'Update roles and control account status without leaving the shell.',
    },
    '/access-requests': {
      title: 'Access Requests',
      subtitle: 'Approve or reject pending platform registrations.',
    },
    '/settings': {
      title: 'Settings',
      subtitle: 'Adjust system thresholds and retraining behavior.',
    },
    '/training': {
      title: 'Training Oversight',
      subtitle: 'Inspect run metrics and promote successful candidates.',
    },
    '/swagger': {
      title: 'Admin References',
      subtitle: 'Quick links to documentation and operational surfaces.',
    },
  };
  const currentCopy = pageCopy[activePage] || pageCopy['/dashboard'];

  if (!authReady && !isLoginPage) {
    return (
      <main className="login-shell">
        <div className="login-card flex items-center gap-4">
          <span className="loading-dot" />
          <div>
            <div className="text-lg font-semibold">Loading admin workspace</div>
            <div className="mt-1 text-sm text-stone-400">Restoring service health and governance data.</div>
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
      {message ? <div className="status-pill success">{message}</div> : null}
      {error ? <div className="inline-alert">{error}</div> : null}

      {activePage === '/dashboard' ? (
        <>
          <section className="grid gap-4 md:grid-cols-3">
            <div className="metric-card">
              <div className="text-sm text-stone-400">Summary Rows</div>
              <div className="mt-3 text-3xl font-semibold">{summaryRows.length}</div>
            </div>
            <div className="metric-card">
              <div className="text-sm text-stone-400">Training Runs</div>
              <div className="mt-3 text-3xl font-semibold">{runs.length}</div>
            </div>
            <div className="metric-card">
              <div className="text-sm text-stone-400">Managed Users</div>
              <div className="mt-3 text-3xl font-semibold">{users.length}</div>
            </div>
          </section>

          <section className="grid gap-6 lg:grid-cols-[1fr_1fr]">
            <SectionCard title="User Role Distribution">
              <div className="insight-grid mb-4">
                <StatTile label="Active Users" value={String(activeUsers)} />
                <StatTile label="Pending Users" value={String(pendingUsers)} hint="Awaiting review or approval" />
              </div>
              <SparkBars items={roleCounts} tone="amber" />
            </SectionCard>
            <SectionCard title="Service Status Trend">
              <div className="insight-grid mb-4">
                <StatTile label="Services Up" value={String(healthCounts.up)} />
                <StatTile label="Services Down" value={String(healthCounts.down)} hint="Needs admin attention" />
              </div>
              <MiniAreaChart points={latencyTrend} />
            </SectionCard>
          </section>

          <section className="grid gap-6 lg:grid-cols-3">
            <a className="surface-card p-6 transition-transform duration-150 hover:-translate-y-1" href="http://localhost:5601" rel="noreferrer" target="_blank">
              <div className="text-sm uppercase tracking-[0.24em] text-amber-300">Observability</div>
              <div className="mt-2 text-xl font-semibold">Kibana</div>
            </a>
            <a className="surface-card p-6 transition-transform duration-150 hover:-translate-y-1" href="http://localhost:5000" rel="noreferrer" target="_blank">
              <div className="text-sm uppercase tracking-[0.24em] text-amber-300">Registry</div>
              <div className="mt-2 text-xl font-semibold">MLflow</div>
            </a>
            <a className="surface-card p-6 transition-transform duration-150 hover:-translate-y-1" href="http://localhost:8088/health" rel="noreferrer" target="_blank">
              <div className="text-sm uppercase tracking-[0.24em] text-amber-300">API</div>
              <div className="mt-2 text-xl font-semibold">MLOPS Health</div>
            </a>
          </section>
        </>
      ) : null}

      {activePage === '/platform' ? (
        <SectionCard title="Platform Health">
          {loading ? (
            <div className="h-64 rounded-2xl skeleton" />
          ) : (
            <div className="space-y-5">
              <SparkBars
                items={health.map((row) => ({
                  label: String(row.service || 'service'),
                  value: String(row.status || '').toUpperCase() === 'UP' ? 1 : 0.3,
                }))}
                tone="emerald"
              />
              <div className="overflow-x-auto">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Service</th>
                      <th>Status</th>
                      <th>Latency</th>
                      <th>Last Checked</th>
                    </tr>
                  </thead>
                  <tbody>
                    {health.map((row, index) => (
                      <tr key={index}>
                        <td>{String(row.service || '')}</td>
                        <td>{String(row.status || '')}</td>
                        <td>{String(row.latency || '')}</td>
                        <td>{String(row.last_checked || '')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </SectionCard>
      ) : null}

      {activePage === '/user-management' ? (
        <SectionCard title="User Management">
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {users.map((managedUser) => (
                  <tr key={managedUser.id}>
                    <td>{managedUser.full_name}</td>
                    <td>
                      <select className="field max-w-[200px]" value={managedUser.role} onChange={(event) => wrapMutation(async () => {
                        await api(`/admin/users/${managedUser.id}/role`, { method: 'PUT', body: JSON.stringify({ role: event.target.value }) });
                        await reloadAfterMutation('User role updated.');
                      })}>
                        <option value="security_analyst">security_analyst</option>
                        <option value="data_scientist">data_scientist</option>
                        <option value="administrator">administrator</option>
                      </select>
                    </td>
                    <td>{managedUser.status}</td>
                    <td className="space-x-2">
                      <button className="button-secondary" onClick={() => wrapMutation(async () => {
                        await api(`/admin/users/${managedUser.id}/activate`, { method: 'PUT' });
                        await reloadAfterMutation('User activation updated.');
                      })}>
                        Toggle Active
                      </button>
                      <button className="button-danger" onClick={() => wrapMutation(async () => {
                        await api(`/admin/users/${managedUser.id}`, { method: 'DELETE' });
                        await reloadAfterMutation('User deleted.');
                      })}>
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>
      ) : null}

      {activePage === '/access-requests' ? (
        <SectionCard title="Access Requests">
          <div className="insight-grid mb-5">
            <StatTile label="Pending Requests" value={String(requests.length)} />
            <StatTile label="Review Window" value={requests.length ? 'Open' : 'Clear'} hint="Access queue status" />
          </div>
          {requests.length ? (
            <div className="space-y-3">
              {requests.map((request) => (
                <div key={request.id} className="surface-soft p-4">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <div className="font-semibold">{request.full_name}</div>
                      <div className="text-sm text-stone-400">{request.email} • {request.role}</div>
                    </div>
                    <div className="flex gap-2">
                      <button className="button-secondary" onClick={() => wrapMutation(async () => {
                        await api(`/admin/requests/${request.id}/approve`, { method: 'PUT' });
                        await reloadAfterMutation('Request approved.');
                      })}>
                        Approve
                      </button>
                      <button className="button-danger" onClick={() => wrapMutation(async () => {
                        await api(`/admin/requests/${request.id}/reject`, { method: 'PUT' });
                        await reloadAfterMutation('Request rejected.');
                      })}>
                        Reject
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state">No pending access requests.</div>
          )}
        </SectionCard>
      ) : null}

      {activePage === '/settings' ? (
        <SectionCard title="Platform Settings" action={<button className="button-primary" onClick={() => wrapMutation(async () => {
          const payload = await api<AdminSettings>('/admin/settings', { method: 'PUT', body: JSON.stringify(settings) });
          setSettings(payload);
          setMessage('Settings saved.');
        })}>Save Settings</button>}>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="block">
              <span className="mb-2 block text-sm text-stone-300">Detection Threshold</span>
              <input className="field" value={settings.detection_threshold} onChange={(event) => setSettings((current) => ({ ...current, detection_threshold: Number(event.target.value) }))} />
            </label>
            <label className="block">
              <span className="mb-2 block text-sm text-stone-300">Alert Frequency</span>
              <input className="field" value={settings.alert_frequency} onChange={(event) => setSettings((current) => ({ ...current, alert_frequency: event.target.value }))} />
            </label>
            <label className="block">
              <span className="mb-2 block text-sm text-stone-300">Retention Days</span>
              <input className="field" value={settings.system_retention_days} onChange={(event) => setSettings((current) => ({ ...current, system_retention_days: Number(event.target.value) }))} />
            </label>
            <label className="surface-soft flex items-center gap-3 p-4">
              <input checked={settings.auto_retrain} onChange={(event) => setSettings((current) => ({ ...current, auto_retrain: event.target.checked }))} type="checkbox" />
              <span>Enable auto retraining</span>
            </label>
          </div>
        </SectionCard>
      ) : null}

      {activePage === '/training' ? (
        <SectionCard title="Training Oversight">
          {topTrainingRuns.length ? (
            <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr] mb-6">
              <div className="surface-soft p-4">
                <div className="mb-3 text-sm font-semibold text-stone-200">F1 Leaderboard</div>
                <SparkBars items={topTrainingRuns} tone="rose" />
              </div>
              <div className="surface-soft p-4">
                <div className="mb-3 text-sm font-semibold text-stone-200">AUC Trend</div>
                <MiniAreaChart points={runs.slice(0, 8).reverse().map((run) => Number(run.auc || 0) * 100)} />
              </div>
            </div>
          ) : null}
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Run</th>
                  <th>Dataset</th>
                  <th>F1</th>
                  <th>AUC</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {runs.length ? (
                  runs.map((run, index) => (
                    <tr key={index}>
                      <td>{String(run.run_id || '')}</td>
                      <td>{String(run.dataset || '')}</td>
                      <td>{Number(run.f1 || 0).toFixed(4)}</td>
                      <td>{Number(run.auc || 0).toFixed(4)}</td>
                      <td>
                        <button className="button-secondary" onClick={() => wrapMutation(async () => {
                          const payload = await api<{ message: string }>(`/train/promote/${String(run.run_id || '')}`, { method: 'POST' });
                          await reloadAfterMutation(payload.message);
                        })}>
                          Promote
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5}>
                      <div className="empty-state">No promoted or tracked runs yet.</div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </SectionCard>
      ) : null}

      {activePage === '/swagger' ? (
        <section className="grid gap-4 md:grid-cols-3">
          <a className="surface-card p-6 transition-transform duration-150 hover:-translate-y-1" href="http://localhost:8006/docs" rel="noreferrer" target="_blank">Admin Swagger</a>
          <a className="surface-card p-6 transition-transform duration-150 hover:-translate-y-1" href="http://localhost:8001/docs" rel="noreferrer" target="_blank">Auth Swagger</a>
          <a className="surface-card p-6 transition-transform duration-150 hover:-translate-y-1" href="http://localhost:5000" rel="noreferrer" target="_blank">MLflow UI</a>
        </section>
      ) : null}
    </Shell>
  );
}
