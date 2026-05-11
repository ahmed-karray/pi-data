import { FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useToast } from '../components/Toaster';
import { defaultRouteForRole } from '../lib/utils';
import { userService } from '../services/api/userService';

const demoAccounts = [
  { label: 'Security Analyst', email: 'analyst@iotinel.com', password: 'analyst123', role: 'security_analyst' },
  { label: 'Data Scientist', email: 'scientist@iotinel.com', password: 'scientist123', role: 'data_scientist' },
  { label: 'Administrator', email: 'admin@iotinel.com', password: 'admin123', role: 'administrator' }
];

export default function LoginPage() {
  const [email, setEmail] = useState('analyst@iotinel.com');
  const [password, setPassword] = useState('analyst123');
  const [loading, setLoading] = useState(false);
  const setCredentials = useAuthStore((state) => state.setCredentials);
  const navigate = useNavigate();
  const toast = useToast();

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);

    try {
      const auth = await userService.authenticate(email, password);
      if (auth.success) {
        setCredentials('mock-jwt-xxx', {
          id: String(auth.user.id),
          name: auth.user.name,
          email: auth.user.email,
          role: auth.user.role as any,
        });
        toast('Connexion réussie', `Bienvenue ${auth.user.name}!`, 'success');
        navigate(defaultRouteForRole(auth.user.role), { replace: true });
        setLoading(false);
        return;
      }
    } catch (error) {
      console.warn('Backend auth unavailable, fallback to demo accounts', error);
    }

    const account = demoAccounts.find((item) => item.email === email && item.password === password);
    if (!account) {
      toast('Authentication failed', 'Veuillez vérifier vos informations.', 'danger');
      setLoading(false);
      return;
    }

    setTimeout(() => {
      setCredentials('mock-jwt-xxx', { id: '1', name: account.label, email: account.email, role: account.role as any });
      toast('Connexion réussie', `Bienvenue ${account.label}!`, 'success');
      navigate(defaultRouteForRole(account.role), { replace: true });
      setLoading(false);
    }, 800);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0A1929] px-4 py-10">
      <div className="w-full max-w-xl rounded-[32px] border border-slate-800 bg-slate-950/90 p-10 shadow-soft">
        <div className="mb-8 text-center">
          <div className="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-3xl bg-brand-500 text-white shadow-soft">
            <span className="text-xl font-bold">I</span>
          </div>
          <h1 className="mt-4 text-3xl font-semibold text-white">IoTinel</h1>
          <p className="mt-2 text-slate-400">AI-Driven Intrusion Detection System for 6G Smart Cities</p>
        </div>

        <form className="space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-200">Email</label>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full rounded-3xl border border-slate-800 bg-slate-900/90 px-4 py-3 text-sm text-white outline-none transition focus:border-brand-400"
              required
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-200">Mot de passe</label>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full rounded-3xl border border-slate-800 bg-slate-900/90 px-4 py-3 text-sm text-white outline-none transition focus:border-brand-400"
              required
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="inline-flex w-full items-center justify-center rounded-3xl bg-brand-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-brand-400 disabled:cursor-not-allowed disabled:bg-slate-700"
          >
            {loading ? 'Connexion...' : 'Se connecter'}
          </button>
        </form>

        <div className="mt-8 rounded-3xl border border-slate-800 bg-slate-900/80 p-4 text-sm text-slate-300">
          <p className="mb-3 uppercase tracking-[0.2em] text-slate-500">Comptes démo</p>
          <div className="flex flex-wrap gap-3">
            {demoAccounts.map((account) => (
              <button
                key={account.email}
                type="button"
                onClick={() => {
                  setEmail(account.email);
                  setPassword(account.password);
                }}
                className="rounded-2xl border border-slate-800 bg-slate-950/90 px-4 py-2 text-sm text-slate-200 transition hover:border-brand-400 hover:text-white"
              >
                {account.label}
              </button>
            ))}
          </div>
        </div>
        <p className="mt-6 text-center text-sm text-slate-400">
          Pas encore de compte ?{' '}
          <Link to="/register" className="font-semibold text-white hover:text-brand-300">
            Inscrivez-vous
          </Link>
        </p>
      </div>
    </div>
  );
}
