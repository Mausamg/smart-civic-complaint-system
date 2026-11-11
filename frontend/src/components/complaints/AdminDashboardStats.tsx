import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/Button';
import { StatCard } from '@/components/ui/StatCard';
import {
  getDashboardStats,
  type DashboardStatsResponse,
} from '@/services/dashboardService';

interface Props {
  accessToken: string | null;
}

export function AdminDashboardStats({ accessToken }: Props) {
  const [stats, setStats] = useState<DashboardStatsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    let cancelled = false;

    setStats(null);
    setLoading(true);
    setError(null);

    if (!accessToken) {
      setLoading(false);
      setError('Please sign in to view administrator statistics.');
      return () => {
        cancelled = true;
      };
    }

    getDashboardStats(accessToken)
      .then((data) => {
        if (!cancelled) setStats(data);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : 'Unable to load administrator statistics.'
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [accessToken, retryCount]);

  const active = stats
    ? stats.submitted + stats.underReview + stats.inProgress
    : null;

  return (
    <section aria-label="Administrator complaint statistics">
      {loading && (
        <p role="status" className="mb-3 text-sm text-ink-500">
          Loading administrator statistics...
        </p>
      )}

      {error && (
        <div role="alert" className="mb-4 rounded-xl border border-error-200 p-4">
          <p className="text-sm text-error-600">{error}</p>
          {accessToken && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setRetryCount((count) => count + 1)}
            >
              Retry
            </Button>
          )}
        </div>
      )}

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
        <StatCard label="Total Complaints" value={stats?.totalComplaints ?? '—'} icon="FileText" iconBg="blue" />
        <StatCard label="Active" value={active ?? '—'} icon="Clock" iconBg="amber" />
        <StatCard label="Resolved" value={stats?.resolved ?? '—'} icon="CheckCircle2" iconBg="green" />
        <StatCard label="High Priority" value={stats?.highPriority ?? '—'} icon="AlertTriangle" iconBg="red" />
        <StatCard label="Unassigned" value={stats?.unassigned ?? '—'} icon="ListTodo" iconBg="teal" />
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Submitted" value={stats?.submitted ?? '—'} icon="FileText" iconBg="blue" />
        <StatCard label="Under Review" value={stats?.underReview ?? '—'} icon="Clock" iconBg="amber" />
        <StatCard label="In Progress" value={stats?.inProgress ?? '—'} icon="Activity" iconBg="purple" />
        <StatCard label="Rejected" value={stats?.rejected ?? '—'} icon="Ban" iconBg="slate" />
      </div>
    </section>
  );
}
