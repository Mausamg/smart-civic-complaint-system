import { CheckCircle2, XCircle, Info, AlertTriangle, X } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { cn } from '@/utils/format';

const config = {
  success: { icon: CheckCircle2, bg: 'bg-success-50', border: 'border-success-200', text: 'text-success-800', iconColor: 'text-success-600' },
  error: { icon: XCircle, bg: 'bg-error-50', border: 'border-error-200', text: 'text-error-800', iconColor: 'text-error-600' },
  warning: { icon: AlertTriangle, bg: 'bg-warning-50', border: 'border-warning-200', text: 'text-warning-800', iconColor: 'text-warning-600' },
  info: { icon: Info, bg: 'bg-primary-50', border: 'border-primary-200', text: 'text-primary-800', iconColor: 'text-primary-600' },
};

export function ToastContainer() {
  const { toasts, removeToast } = useApp();
  return (
    <div className="fixed bottom-4 right-4 z-[100] flex w-full max-w-sm flex-col gap-2" aria-live="polite" aria-atomic="true">
      {toasts.map((t) => {
        const c = config[t.type];
        const Icon = c.icon;
        return (
          <div
            key={t.id}
            className={cn('flex items-start gap-3 rounded-xl border p-3.5 shadow-float animate-slide-in-right', c.bg, c.border)}
            role="alert"
          >
            <Icon className={cn('mt-0.5 h-5 w-5 shrink-0', c.iconColor)} aria-hidden />
            <div className="flex-1">
              <p className={cn('text-sm font-semibold', c.text)}>{t.title}</p>
              {t.message && <p className="mt-0.5 text-xs text-ink-600">{t.message}</p>}
            </div>
            <button onClick={() => removeToast(t.id)} className="text-ink-400 hover:text-ink-600" aria-label="Dismiss">
              <X className="h-4 w-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
