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

export function AdminRecentComplaints({ accessToken }: Props) {
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
      setLoading(false);
      setError('Please sign in to view recent complaints.');

      return () => {
        cancelled = true;
      };
    }

    getDashboardRecentComplaints(accessToken)
      .then((data) => {
        if (!cancelled) setComplaints(data);
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
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [accessToken, retryCount]);

  return (
    <Card className="p-5">
      <h3 className="text-sm font-semibold text-ink-900 dark:text-ink-100">
        Recent system activity
      </h3>

      <p className="mt-1 text-xs text-ink-500">
        Five most recently submitted complaints.
      </p>

      <div className="mt-3 space-y-2">
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
          <p className="text-sm text-ink-500">
            No complaints have been submitted yet.
          </p>
        )}

        {!loading && !error &&
          complaints.map((complaint) => (
            <Link
              key={complaint.id}
              to={`/admin/complaints/${complaint.id}`}
              className="block rounded-lg px-3 py-3 transition hover:bg-ink-50 dark:hover:bg-ink-800/50"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="min-w-0 text-sm font-medium text-ink-900 dark:text-ink-100">
                  {complaint.title}
                </p>
                <span className="text-xs font-medium text-primary-600">
                  {readableStatus(complaint.status)}
                </span>
              </div>

              <p className="mt-1 text-xs text-ink-500">
                {complaint.category} · {complaint.priority} priority
              </p>

              <div className="mt-1 flex flex-wrap justify-between gap-2 text-xs text-ink-500">
                <span>{complaint.location}</span>
                <time dateTime={complaint.createdAt}>
                  {new Date(complaint.createdAt).toLocaleDateString()}
                </time>
              </div>
            </Link>
          ))}
      </div>
    </Card>
  );
}
