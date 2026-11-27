import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { LiveComplaintStatusBadge } from '@/components/complaints/LiveComplaintCard';

import {
  getComplaintStatusHistory,
  type ComplaintStatusHistoryResponse,
} from '@/services/complaintService';

interface Props {
  complaintId: string;
  accessToken: string;
  audience: 'citizen' | 'internal';
}

export function ComplaintStatusHistoryPanel({
  complaintId,
  accessToken,
  audience,
}: Props) {
  const [history, setHistory] =
    useState<ComplaintStatusHistoryResponse[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    let cancelled = false;

    setLoading(true);
    setHistory([]);
    setError(null);

    getComplaintStatusHistory(complaintId, accessToken)
      .then((data) => {
        if (!cancelled) {
          const sorted = [...data].sort(
            (a, b) =>
              new Date(b.changedAtUtc).getTime() -
              new Date(a.changedAtUtc).getTime()
          );

          setHistory(sorted);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : 'Unable to load status history.'
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
  }, [complaintId, accessToken, retryCount]);

  return (
    <Card className="mt-4 p-5">
      <h2 className="text-lg font-semibold text-ink-900 dark:text-ink-100">
        Complaint Status History
      </h2>

      <p className="mt-1 text-sm text-ink-500 dark:text-ink-300">
        {audience === 'citizen'
          ? 'Track the recorded progress of your complaint.'
          : 'Recorded status changes and explanations.'}
      </p>

      {loading && (
        <p role="status" className="mt-4 text-sm text-ink-500 dark:text-ink-300">
          Loading status history...
        </p>
      )}

      {!loading && error && (
        <div className="mt-4 space-y-3">
          <p role="alert" className="text-sm text-error-600">
            {error}
          </p>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setRetryCount((count) => count + 1)}
          >
            Try again
          </Button>
        </div>
      )}

      {!loading && !error && history.length === 0 && (
        <p className="mt-4 text-sm text-ink-500 dark:text-ink-300">
          No status changes have been recorded yet.
        </p>
      )}

      {!loading && !error && history.length > 0 && (
        <ol className="mt-5 space-y-4">
          {history.map((entry) => (
            <li
              key={entry.id}
              className="rounded-xl border border-ink-100 p-4 dark:border-ink-800"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <LiveComplaintStatusBadge status={entry.oldStatus} />
                  <span className="sr-only">changed to</span>
                  <span aria-hidden="true" className="text-ink-500 dark:text-ink-300">
                    →
                  </span>
                  <LiveComplaintStatusBadge status={entry.newStatus} />
                </div>

                <time
                  dateTime={entry.changedAtUtc}
                  className="text-xs text-ink-500 dark:text-ink-300"
                >
                  {new Date(entry.changedAtUtc).toLocaleString()}
                </time>
              </div>

              {audience === 'internal' && entry.changedByName && (
                <p className="mt-2 text-xs text-ink-500 dark:text-ink-300">
                  Changed by: {entry.changedByName}
                </p>
              )}

              {entry.note && (
                <div className="mt-3 rounded-lg bg-ink-50 p-3 dark:bg-ink-800/50">
                  <p className="text-xs font-medium text-ink-500 dark:text-ink-300">
                    Explanation
                  </p>

                  <p className="mt-1 whitespace-pre-wrap break-words text-sm text-ink-700 dark:text-ink-200">
                    {entry.note}
                  </p>
                </div>
              )}
            </li>
          ))}
        </ol>
      )}
    </Card>
  );
}
