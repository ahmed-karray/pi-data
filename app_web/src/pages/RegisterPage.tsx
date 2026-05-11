import { FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { userService, CreateUserData } from '../services/api/userService';
import { useToast } from '../components/Toaster';

const roles = [
  { value: 'security_analyst', label: 'Security Analyst' },
  { value: 'data_scientist', label: 'Data Scientist' },
  { value: 'administrator', label: 'Administrator' },
];

export default function RegisterPage() {
  const [formData, setFormData] = useState<CreateUserData>({
    name: '',
    email: '',
    password: '',
    role: 'security_analyst',
  });
  const [loading, setLoading] = useState(false);
  const toast = useToast();
  const navigate = useNavigate();

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!formData.name || !formData.email || !formData.password) {
      toast('Erreur', 'Tous les champs sont requis.', 'danger');
      return;
    }
    setLoading(true);
    try {
      await userService.createUser(formData);
      toast('Compte créé', 'Vous pouvez maintenant vous connecter.', 'success');
      navigate('/login');
    } catch (error: any) {
      toast('Erreur', error.message || 'Échec de la création du compte.', 'danger');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0A1929] px-4 py-10">
      <div className="w-full max-w-xl rounded-[32px] border border-slate-800 bg-slate-950/90 p-10 shadow-soft">
        <div className="mb-8 text-center">
          <div className="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-3xl bg-brand-500 text-white shadow-soft">
            <span className="text-xl font-bold">I</span>
          </div>
          <h1 className="mt-4 text-3xl font-semibold text-white">Créer un compte</h1>
          <p className="mt-2 text-slate-400">Inscrivez-vous pour accéder à IoTinel.</p>
        </div>

        <form className="space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-200">Nom complet</label>
            <input
              type="text"
              value={formData.name}
              onChange={(event) => setFormData({ ...formData, name: event.target.value })}
              className="w-full rounded-3xl border border-slate-800 bg-slate-900/90 px-4 py-3 text-sm text-white outline-none transition focus:border-brand-400"
              placeholder="Votre nom"
              required
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-200">Email</label>
            <input
              type="email"
              value={formData.email}
              onChange={(event) => setFormData({ ...formData, email: event.target.value })}
              className="w-full rounded-3xl border border-slate-800 bg-slate-900/90 px-4 py-3 text-sm text-white outline-none transition focus:border-brand-400"
              placeholder="Votre adresse email"
              required
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-200">Mot de passe</label>
            <input
              type="password"
              value={formData.password}
              onChange={(event) => setFormData({ ...formData, password: event.target.value })}
              className="w-full rounded-3xl border border-slate-800 bg-slate-900/90 px-4 py-3 text-sm text-white outline-none transition focus:border-brand-400"
              placeholder="Minimum 6 caractères"
              required
              minLength={6}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-200">Rôle</label>
            <select
              aria-label="Sélectionner un rôle utilisateur"
              title="Sélectionner un rôle utilisateur"
              value={formData.role}
              onChange={(event) => setFormData({ ...formData, role: event.target.value })}
              className="w-full rounded-3xl border border-slate-800 bg-slate-900/90 px-4 py-3 text-sm text-white outline-none transition focus:border-brand-400"
            >
              {roles.map((role) => (
                <option key={role.value} value={role.value}>
                  {role.label}
                </option>
              ))}
            </select>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="inline-flex w-full items-center justify-center rounded-3xl bg-brand-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-brand-400 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? 'Création...' : 'Créer un compte'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-400">
          Déjà inscrit ?{' '}
          <Link to="/login" className="font-semibold text-white hover:text-brand-300">
            Connectez-vous
          </Link>
        </p>
      </div>
    </div>
  );
}
