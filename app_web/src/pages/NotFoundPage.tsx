import { Link } from 'react-router-dom';

export default function NotFoundPage() {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center rounded-3xl border border-slate-800 bg-white/5 p-10 text-center shadow-soft">
      <p className="text-sm uppercase tracking-[0.3em] text-brand-300">404</p>
      <h1 className="mt-4 text-4xl font-semibold text-white">Page introuvable</h1>
      <p className="mt-4 max-w-md text-sm leading-6 text-slate-400">L’adresse saisie n’est pas valide. Retournez au tableau de bord.</p>
      <Link to="/dashboard" className="mt-8 inline-flex rounded-3xl bg-brand-500 px-6 py-3 text-sm font-semibold text-white transition hover:bg-brand-400">
        Retour au dashboard
      </Link>
    </div>
  );
}
