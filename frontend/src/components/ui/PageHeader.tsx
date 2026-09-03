import { Link } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';
import type { ReactNode } from 'react';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  breadcrumbs?: { label: string; to?: string }[];
  actions?: ReactNode;
  icon?: ReactNode;
}

export function PageHeader({ title, subtitle, breadcrumbs, actions, icon }: PageHeaderProps) {
  return (
    <div className="mb-6">
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav className="mb-3 flex items-center gap-1.5 text-xs text-ink-500" aria-label="Breadcrumb">
          <Link to="/" className="hover:text-ink-700 dark:hover:text-ink-300">
            <Home className="h-3.5 w-3.5" />
          </Link>
          {breadcrumbs.map((b, i) => (
            <span key={i} className="flex items-center gap-1.5">
              <ChevronRight className="h-3.5 w-3.5" />
              {b.to ? (
                <Link to={b.to} className="hover:text-ink-700 dark:hover:text-ink-300">
                  {b.label}
                </Link>
              ) : (
                <span className="font-medium text-ink-700 dark:text-ink-300">{b.label}</span>
              )}
            </span>
          ))}
        </nav>
      )}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          {icon && <div className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-xl bg-primary-50 text-primary-600 dark:bg-primary-950/40">{icon}</div>}
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-ink-900 dark:text-ink-100">{title}</h1>
            {subtitle && <p className="mt-1 text-sm text-ink-500">{subtitle}</p>}
          </div>
        </div>
        {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
      </div>
    </div>
  );
}
