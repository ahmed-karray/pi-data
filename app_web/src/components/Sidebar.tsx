import { NavLink } from 'react-router-dom';
import { Activity, ChartLine, Database, FileSearch, Settings, Users, Zap } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { getRoleColor, getRoleLabel } from '../lib/utils';

const navItems = [
  { name: 'Dashboard', path: '/dashboard', icon: ChartLine, roles: ['security_analyst', 'data_scientist', 'administrator'] },
  { name: 'Live Detection', path: '/live-detection', icon: Zap, roles: ['security_analyst', 'data_scientist', 'administrator'] },
  { name: 'Model Comparison', path: '/model-comparison', icon: Database, roles: ['security_analyst', 'data_scientist', 'administrator'] },
  { name: 'Batch Analysis', path: '/batch-analysis', icon: FileSearch, roles: ['security_analyst', 'data_scientist', 'administrator'] },
  { name: 'Monitoring', path: '/monitoring', icon: Activity, roles: ['data_scientist', 'administrator'] },
  { name: 'Settings', path: '/settings', icon: Settings, roles: ['administrator'] },
  { name: 'User Management', path: '/user-management', icon: Users, roles: ['administrator'] }
];

export default function Sidebar() {
  const { user, clearAuth } = useAuthStore();

  if (!user) return null;

  const items = navItems.filter((item) => item.roles.includes(user.role));

  return (
    <aside className="flex min-h-screen w-72 flex-col border-r border-slate-800 bg-[#081623] px-4 py-6 text-slate-200">
      <div className="mb-10">
        <div className="inline-flex items-center gap-2 rounded-3xl border border-brand-500/20 bg-brand-500/10 px-4 py-3 text-sm font-semibold text-brand-100 shadow-soft">
          <span className="h-2.5 w-2.5 rounded-full bg-brand-400" />
          HEXAMIND SECURITY
        </div>
        <div className="mt-8">
          <h1 className="text-2xl font-semibold text-white">IoTinel</h1>
          <p className="mt-2 text-sm text-slate-400">AI-Driven IDS for 6G Smart Cities</p>
        </div>
      </div>
      <nav className="space-y-1">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition ${
                  isActive ? 'border-l-4 border-brand-400 bg-slate-900 text-brand-200' : 'text-slate-300 hover:bg-slate-900 hover:text-white'
                }`
              }
            >
              <Icon size={18} />
              {item.name}
            </NavLink>
          );
        })}
      </nav>
      <div className="mt-auto rounded-3xl border border-slate-800 bg-slate-950/50 p-4 shadow-soft">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Logged in as</p>
            <p className="mt-2 font-semibold text-white">{user.name}</p>
          </div>
          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${getRoleColor(user.role)}`}>
            {getRoleLabel(user.role)}
          </span>
        </div>
        <button
          type="button"
          onClick={clearAuth}
          className="mt-4 w-full rounded-2xl bg-slate-800 px-3 py-2 text-sm font-medium text-slate-100 transition hover:bg-slate-700"
        >
          Logout
        </button>
      </div>
    </aside>
  );
}
