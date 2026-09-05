import { Link } from 'react-router-dom';
import { AlertTriangle, ArrowRight, TrendingUp } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { StatusBadge, PriorityBadge, CategoryBadge } from '@/components/ui/StatusBadge';
import { complaints } from '@/data/mockData';
import { formatDate, timeAgo } from '@/utils/format';

export function EscalationsPage() {
  const escalated = complaints.filter((c) => c.priority === 'urgent' || c.status === 'reopened');
  return (
    <div>
      <PageHeader title="Escalated Complaints" subtitle="Complaints needing immediate administrative attention." breadcrumbs={[{ label: 'Admin', to: '/admin/dashboard' }, { label: 'Escalations' }]} />
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <Card className="p-5"><p className="text-xs text-ink-500">Total escalations</p><p className="mt-2 text-2xl font-bold text-error-600">{escalated.length}</p></Card>
        <Card className="p-5"><p className="text-xs text-ink-500">Unresolved urgent</p><p className="mt-2 text-2xl font-bold text-warning-600">{escalated.filter((c) => c.priority === 'urgent').length}</p></Card>
        <Card className="p-5"><p className="text-xs text-ink-500">Reopened</p><p className="mt-2 text-2xl font-bold text-pink-600">{escalated.filter((c) => c.status === 'reopened').length}</p></Card>
      </div>
      <div className="space-y-3">
        {escalated.map((c) => (
          <Link key={c.id} to={`/admin/complaints/${c.id}`}>
            <Card hover className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-error-50 text-error-600"><AlertTriangle className="h-5 w-5" /></div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <CategoryBadge category={c.category} />
                  <PriorityBadge priority={c.priority} />
                  <StatusBadge status={c.status} size="sm" />
                </div>
                <p className="mt-1.5 truncate text-sm font-semibold text-ink-900 dark:text-ink-100">{c.title}</p>
                <p className="text-xs text-ink-500">{c.trackingId} · {c.ward} · Submitted {formatDate(c.submittedAt)} · Updated {timeAgo(c.lastUpdate)}</p>
              </div>
              <ArrowRight className="h-5 w-5 shrink-0 text-ink-400" />
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
