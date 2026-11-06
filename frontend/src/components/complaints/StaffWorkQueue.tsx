import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

import {
  getAssignedComplaints,
  type ComplaintApiResponse,
} from '@/services/complaintService';

interface Props {
  accessToken: string | null;
}

function readableStatus(status: string): string {
  return status.replace(/([a-z])([A-Z])/g, '$1 $2');
}

export function StaffWorkQueue({ accessToken }: Props) {
  const [complaints, setComplaints] =
    useState<ComplaintApiResponse[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    let cancelled = false;

    setLoading(true);
    setError(null);
    setComplaints([]);

    if (!accessToken) {
      setError('Please sign in to view assigned complaints.');
      setLoading(false);

      return () => {
        cancelled = true;
      };
    }

    getAssignedComplaints(accessToken)
      .then((data) => {
        if (!cancelled) {
          const sorted = [...data].sort(
            (a, b) =>
              new Date(b.createdAt).getTime() -
              new Date(a.createdAt).getTime()
          );

          setComplaints(sorted);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : 'Unable to load assigned complaints.'
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
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-ink-900 dark:text-ink-100">
          Active assigned complaints
        </h3>

        <Link
          to="/staff/queue"
          className="text-xs font-medium text-primary-600 hover:underline"
        >
          View all →
        </Link>
      </div>

      <div className="mt-4 space-y-3">
        {loading && (
          <p role="status" className="text-sm text-ink-500">
            Loading assigned complaints...
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
          <p className="rounded-xl bg-ink-50 px-4 py-6 text-center text-sm text-ink-500 dark:bg-ink-800/50">
            No active complaints assigned to you.
          </p>
        )}

        {!loading && !error &&
          complaints.slice(0, 4).map((complaint) => (
            <Link
              key={complaint.id}
              to={`/staff/complaints/${complaint.id}`}
              className="block rounded-xl border border-ink-100 p-4 transition hover:border-primary-200 hover:bg-primary-50/40 dark:border-ink-800 dark:hover:bg-primary-950/20"
            >
              <div className="flex flex-wrap items-center gap-2 text-xs text-ink-500">
                <span>{complaint.category}</span>
                <span>·</span>
                <span>{complaint.priority} priority</span>
              </div>

              <p className="mt-2 text-sm font-semibold text-ink-900 dark:text-ink-100">
                {complaint.title}
              </p>

              <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-ink-500">
                <span>
                  Submitted{' '}
                  {new Date(complaint.createdAt).toLocaleDateString()}
                </span>

                <span className="font-medium text-primary-600">
                  {readableStatus(complaint.status)}
                </span>
              </div>
            </Link>
          ))}
      </div>
    </Card>
  );
}
