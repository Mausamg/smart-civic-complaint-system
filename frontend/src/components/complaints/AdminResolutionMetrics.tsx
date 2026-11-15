import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

import {
  getDashboardResolutionMetrics,
  type DashboardResolutionMetricsResponse,
} from '@/services/dashboardService';

interface Props {
  accessToken: string | null;
}

export function AdminResolutionMetrics({ accessToken }: Props) {
  const [metrics, setMetrics] =
    useState<DashboardResolutionMetricsResponse | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    let cancelled = false;

    setMetrics(null);
    setLoading(true);
    setError(null);

    if (!accessToken) {
      setLoading(false);
      setError('Please sign in to view resolution metrics.');

      return () => {
        cancelled = true;
      };
    }

    getDashboardResolutionMetrics(accessToken)
      .then((data) => {
        if (!cancelled) setMetrics(data);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : 'Unable to load resolution metrics.'
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

  const rate = metrics && metrics.totalComplaints > 0
    ? `${metrics.resolutionRate.toFixed(1)}%`
    : '—';

  const averageHours = metrics && metrics.resolvedComplaints > 0
    ? `${metrics.averageResolutionTimeHours.toFixed(1)} h`
    : '—';

  return (
    <Card className="p-5">
      <h3 className="text-sm font-semibold text-ink-900 dark:text-ink-100">
        Resolution performance
      </h3>

      <p className="mt-1 text-xs text-ink-500">
        Overall complaint resolution statistics
      </p>

      {loading && (
        <p role="status" className="mt-4 text-sm text-ink-500">
          Loading resolution metrics...
        </p>
      )}

      {!loading && error && (
        <div role="alert" className="mt-4 space-y-3">
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

      {!loading && !error && metrics && (
        <>
          <div className="mt-5 grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-success-50 p-4 dark:bg-success-950/30">
              <p className="text-xs text-ink-500 dark:text-ink-400">
                Resolution rate
              </p>
              <p className="mt-2 text-2xl font-bold text-success-700 dark:text-success-300">
                {rate}
              </p>
            </div>

            <div className="rounded-xl bg-primary-50 p-4 dark:bg-primary-950/30">
              <p className="text-xs text-ink-500 dark:text-ink-400">
                Avg. resolution time
              </p>
              <p className="mt-2 text-2xl font-bold text-primary-700 dark:text-primary-300">
                {averageHours}
              </p>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap justify-between gap-2 border-t border-ink-100 pt-3 text-xs text-ink-500 dark:border-ink-800">
            <span>Resolved: {metrics.resolvedComplaints}</span>
            <span>Eligible complaints: {metrics.totalComplaints}</span>
          </div>

          <p className="mt-2 text-xs text-ink-400">
            Resolution rate excludes withdrawn complaints.
          </p>
        </>
      )}
    </Card>
  );
}
