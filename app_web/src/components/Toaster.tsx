import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from 'react';
import { X } from 'lucide-react';

type ToastVariant = 'success' | 'danger' | 'info';

type ToastItem = {
  id: string;
  title: string;
  description?: string;
  variant: ToastVariant;
};

interface ToastContextValue {
  notify: (title: string, description?: string, variant?: ToastVariant) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export function ToasterProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const notify = (title: string, description?: string, variant: ToastVariant = 'success') => {
    const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    setToasts((current) => [...current, { id, title, description, variant }]);
  };

  useEffect(() => {
    if (!toasts.length) return;
    const timers = toasts.map((toast) =>
      setTimeout(() => setToasts((current) => current.filter((item) => item.id !== toast.id)), 4200)
    );
    return () => timers.forEach(clearTimeout);
  }, [toasts]);

  const value = useMemo(() => ({ notify }), []);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed right-4 top-4 z-50 flex w-[320px] flex-col gap-3">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto rounded-2xl border px-4 py-3 shadow-soft backdrop-blur-sm ${
              toast.variant === 'success'
                ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-100'
                : toast.variant === 'danger'
                ? 'border-red-500/20 bg-red-500/10 text-red-100'
                : 'border-slate-700/50 bg-slate-950/90 text-slate-100'
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold">{toast.title}</h3>
                {toast.description ? <p className="mt-1 text-xs text-slate-300">{toast.description}</p> : null}
              </div>
              <button
                type="button"
                className="text-slate-400 transition hover:text-slate-200"
                onClick={() => setToasts((current) => current.filter((item) => item.id !== toast.id))}
              >
                <X size={16} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within ToasterProvider');
  }
  return context.notify;
}
