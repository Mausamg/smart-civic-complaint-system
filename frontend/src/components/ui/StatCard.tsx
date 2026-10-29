import { cn } from '@/utils/format';

interface StatCardProps {
  label: string;
  value: string | number;
  icon: string;
  iconBg?: string;
  iconColor?: string;
  trend?: { value: string; up: boolean };
  hint?: string;
  className?: string;
}

const iconColors: Record<string, { bg: string; color: string }> = {
  blue: { bg: 'bg-primary-50 dark:bg-primary-950/40', color: 'text-primary-600' },
  green: { bg: 'bg-success-50 dark:bg-success-950/40', color: 'text-success-600' },
  amber: { bg: 'bg-warning-50 dark:bg-warning-950/40', color: 'text-warning-600' },
  red: { bg: 'bg-error-50 dark:bg-error-950/40', color: 'text-error-600' },
  purple: { bg: 'bg-purple-50 dark:bg-purple-950/40', color: 'text-purple-600' },
  teal: { bg: 'bg-accent-50 dark:bg-accent-950/40', color: 'text-accent-600' },
  orange: { bg: 'bg-orange-50 dark:bg-orange-950/40', color: 'text-orange-600' },
  slate: { bg: 'bg-ink-100 dark:bg-ink-800', color: 'text-ink-600' },
};

export function StatCard({ label, value, icon, iconBg = 'blue', trend, hint, className }: StatCardProps) {
  const c = iconColors[iconBg] ?? iconColors.blue;
  return (
    <div className={cn('card p-5', className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-ink-500 dark:text-ink-400">{label}</p>
          <p className="mt-2 text-2xl font-bold tracking-tight text-ink-900 dark:text-ink-100">{value}</p>
          {hint && <p className="mt-1 text-xs text-ink-400">{hint}</p>}
          {trend && (
            <p className={cn('mt-2 inline-flex items-center gap-1 text-xs font-medium', trend.up ? 'text-success-600' : 'text-error-600')}>
              {trend.up ? '▲' : '▼'} {trend.value}
            </p>
          )}
        </div>
        <div className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-xl', c.bg, c.color)} aria-hidden>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            {icon === 'FileText' && <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6" /><path d="M16 13H8M16 17H8M10 9H8" /></>}
            {icon === 'CheckCircle2' && <><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><path d="m9 11 3 3L22 4" /></>}
            {icon === 'Clock' && <><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></>}
            {icon === 'TrendingUp' && <><polyline points="22 7 13.5 15.5 8.5 10.5 2 17" /><polyline points="16 7 22 7 22 13" /></>}
            {icon === 'Users' && <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" /></>}
            {icon === 'AlertTriangle' && <><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" /><path d="M12 9v4M12 17h.01" /></>}
            {icon === 'Star' && <><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></>}
            {icon === 'Building2' && <><path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z" /><path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2M10 6h4M10 10h4M10 14h4M10 18h4" /></>}
            {icon === 'Activity' && <><path d="M22 12h-4l-3 9L9 3l-3 9H2" /></>}
            {icon === 'ListTodo' && <><path d="M3 3h18v18H3z" opacity="0" /><path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" /></>}
            {icon === 'Loader' && <><line x1="12" y1="2" x2="12" y2="6" /><line x1="12" y1="18" x2="12" y2="22" /><line x1="4.93" y1="4.93" x2="7.76" y2="7.76" /><line x1="16.24" y1="16.24" x2="19.07" y2="19.07" /><line x1="2" y1="12" x2="6" y2="12" /><line x1="18" y1="12" x2="22" y2="12" /><line x1="4.93" y1="19.07" x2="7.76" y2="16.24" /><line x1="16.24" y1="7.76" x2="19.07" y2="4.93" /></>}
            {icon === 'MessageSquare' && <><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></>}
            {icon === 'Ban' && <><circle cx="12" cy="12" r="10" /><path d="m4.93 4.93 14.14 14.14" /></>}
            {icon === 'RotateCcw' && <><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" /><path d="M3 3v5h5" /></>}
            {icon === 'Gauge' && <><path d="m12 14 4-4" /><path d="M3.34 19a10 10 0 1 1 17.32 0" /></>}
            {icon === 'Timer' && <><line x1="10" y1="2" x2="14" y2="2" /><line x1="12" y1="14" x2="15.11" y2="10.89" /><circle cx="12" cy="14" r="8" /></>}
            {icon === 'ThumbsUp' && <><path d="M7 10v12M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2a3.13 3.13 0 0 1 3 3.88Z" /></>}
          </svg>
        </div>
      </div>
    </div>
  );
}
