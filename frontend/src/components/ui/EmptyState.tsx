import type { ReactNode } from 'react';
import { cn } from '@/utils/format';
import { Icon } from './Icon';

interface EmptyStateProps {
  icon?: string;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({ icon = 'Inbox', title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center rounded-2xl border border-dashed border-ink-200 bg-ink-50/50 px-6 py-12 text-center dark:border-ink-700 dark:bg-ink-900/50', className)}>
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-ink-400 shadow-soft dark:bg-ink-800">
        <Icon name={icon} className="h-7 w-7" />
      </div>
      <h3 className="text-base font-semibold text-ink-900 dark:text-ink-100">{title}</h3>
      {description && <p className="mt-1 max-w-sm text-sm text-ink-500">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function ErrorState({ title = 'Something went wrong', description, onRetry }: { title?: string; description?: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-error-200 bg-error-50 px-6 py-12 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-error-100 text-error-600">
        <Icon name="AlertTriangle" className="h-7 w-7" />
      </div>
      <h3 className="text-base font-semibold text-error-900">{title}</h3>
      {description && <p className="mt-1 max-w-sm text-sm text-error-700">{description}</p>}
      {onRetry && (
        <button onClick={onRetry} className="mt-5 h-10 rounded-xl bg-error-600 px-4 text-sm font-medium text-white hover:bg-error-700">
          Try again
        </button>
      )}
    </div>
  );
}
