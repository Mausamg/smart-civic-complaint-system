import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

import {
  getDashboardRecentComplaints,
  type DashboardRecentComplaintResponse,
} from '@/services/dashboardService';

interface Props {
  accessToken: string | null;
}

function readableStatus(value: string): string {
  return value.replace(/([a-z])([A-Z])/g, '$1 $2');
}

export function StaffRecentComplaints({ accessToken }: Props) {
  const [complaints, setComplaints] =
    useState<DashboardRecentComplaintResponse[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    let cancelled = false;

    setLoading(true);
    setError(null);
    setComplaints([]);

    if (!accessToken) {
      setError('Please sign in to view recent complaints.');
      setLoading(false);

      return () => {
        cancelled = true;
      };
    }

    getDashboardRecentComplaints(accessToken)
      .then((data) => {
        if (!cancelled) {
          setComplaints(data);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : 'Unable to load recent complaints.'
          );
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [accessToken, retryCount]);

  return (
    <Card className="p-5">
      <h3 className="text-sm font-semibold text-ink-900 dark:text-ink-100">
        Recent complaints
      </h3>

      <p className="mt-1 text-xs text-ink-500">
        Recently submitted complaints assigned to you.
      </p>

      <div className="mt-4 space-y-3">
        {loading && (
          <p role="status" className="text-sm text-ink-500">
            Loading recent complaints...
          </p>
        )}

        {!loading && error && (
          <div role="alert" className="space-y-3">
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

        {!loading && !error && complaints.length === 0 && (
          <p className="rounded-xl bg-ink-50 p-4 text-center text-sm text-ink-500 dark:bg-ink-800/50">
            No recent complaints assigned to you.
          </p>
        )}

        {!loading && !error &&
          complaints.map((complaint) => (
            <Link
              key={complaint.id}
              to={`/staff/complaints/${complaint.id}`}
              className="block rounded-xl border border-ink-100 p-4 transition hover:border-primary-200 hover:bg-primary-50/40 dark:border-ink-800 dark:hover:bg-primary-950/20"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="min-w-0 text-sm font-semibold text-ink-900 dark:text-ink-100">
                  {complaint.title}
                </p>

                <span className="text-xs font-medium text-primary-600">
                  {readableStatus(complaint.status)}
                </span>
              </div>

              <p className="mt-2 text-xs text-ink-500">
                {complaint.category} · {complaint.priority} priority
              </p>

              <div className="mt-2 flex flex-wrap justify-between gap-2 text-xs text-ink-500">
                <span>{complaint.location}</span>

                <time dateTime={complaint.createdAt}>
                  Submitted{' '}
                  {new Date(complaint.createdAt).toLocaleDateString()}
                </time>
              </div>
            </Link>
          ))}
      </div>
    </Card>
  );
}
