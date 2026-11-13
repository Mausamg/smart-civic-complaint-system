import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, ArrowUpRight, RefreshCw } from 'lucide-react';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { PageHeader } from '@/components/ui/PageHeader';
import { useApp } from '@/context/AppContext';

import {
  getAdminComplaints,
  type ComplaintApiResponse,
} from '@/services/complaintService';

const terminalStatuses = new Set([
  'resolved',
  'rejected',
  'withdrawn',
]);

function normalized(value: string): string {
  return value.replace(/[^a-z]/gi, '').toLowerCase();
}

function isCriticalOpen(
  complaint: ComplaintApiResponse
): boolean {
  return (
    normalized(complaint.priority) === 'critical' &&
    !terminalStatuses.has(normalized(complaint.status))
  );
}

function readable(value: string): string {
  return value.replace(/([a-z])([A-Z])/g, '$1 $2');
}

function dateLabel(date: string): string {
  const parsed = new Date(date);

  return Number.isNaN(parsed.getTime())
    ? 'Unknown date'
    : parsed.toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
}

export function EscalationsPage() {
  const { accessToken } = useApp();

  const [complaints, setComplaints] = useState<
    ComplaintApiResponse[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    let cancelled = false;

    setLoading(true);
    setError(null);

    if (!accessToken) {
      setComplaints([]);
      setError('Please sign in as an administrator.');
      setLoading(false);
      return;
    }

    async function load(token: string) {
      try {
        const first = await getAdminComplaints(token, {
          page: 1,
          pageSize: 100,
        });

        const results = [...first.items];

        for (let page = 2; page <= first.totalPages; page++) {
          if (cancelled) return;

          const next = await getAdminComplaints(token, {
            page,
            pageSize: 100,
          });

          results.push(...next.items);
        }

        if (!cancelled) setComplaints(results);
      } catch (err: unknown) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : 'Unable to load urgent complaints.'
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load(accessToken);

    return () => {
      cancelled = true;
    };
  }, [accessToken, refresh]);

  const urgent = useMemo(
    () =>
      complaints
        .filter(isCriticalOpen)
        .sort(
          (a, b) =>
            new Date(b.createdAt).getTime() -
            new Date(a.createdAt).getTime()
        ),
    [complaints]
  );

  const unassigned = urgent.filter(
    (complaint) => !complaint.assignedToUserId
  ).length;

  const inProgress = urgent.filter(
    (complaint) =>
      normalized(complaint.status) === 'inprogress'
  ).length;

  return (
    <div>
      <PageHeader
        title="Urgent Attention"
        subtitle="Monitor unresolved Critical-priority complaints."
        breadcrumbs={[
          { label: 'Admin', to: '/admin/dashboard' },
          { label: 'Escalations' },
        ]}
        actions={
          <Button
            size="sm"
            variant="outline"
            disabled={loading}
            leftIcon={<RefreshCw className="h-4 w-4" />}
            onClick={() => setRefresh((n) => n + 1)}
          >
            Refresh
          </Button>
        }
      />

      <Card className="mb-5 border-warning-200 bg-warning-50/50 p-4 dark:border-warning-900 dark:bg-warning-950/20">
        <div className="flex items-start gap-3">
          <AlertTriangle
            className="mt-0.5 h-5 w-5 shrink-0 text-warning-600"
            aria-hidden="true"
          />
          <p className="text-sm leading-6 text-ink-700 dark:text-ink-200">
            This queue highlights unresolved complaints with
            Critical priority. Formal escalation tracking and
            reopened-complaint workflows are not yet implemented.
          </p>
        </div>
      </Card>

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        {[
          { label: 'Critical unresolved', value: urgent.length },
          { label: 'Awaiting staff', value: unassigned },
          { label: 'In progress', value: inProgress },
        ].map((metric) => (
          <Card key={metric.label} className="p-5">
            <p className="text-xs font-medium text-ink-500">
              {metric.label}
            </p>
            <p className="mt-2 text-3xl font-semibold tabular-nums text-ink-900 dark:text-ink-100">
              {loading || error ? '—' : metric.value}
            </p>
          </Card>
        ))}
      </div>

      {loading ? (
        <Card className="p-6">
          <p role="status" className="text-sm text-ink-500">
            Loading live complaint data...
          </p>
        </Card>
      ) : error ? (
        <Card className="space-y-3 p-6">
          <p role="alert" className="text-sm text-error-600">
            {error}
          </p>
          <Button
            size="sm"
            onClick={() => setRefresh((n) => n + 1)}
          >
            Try again
          </Button>
        </Card>
      ) : urgent.length === 0 ? (
        <Card className="p-8 text-center">
          <h2 className="font-semibold text-ink-900 dark:text-ink-100">
            No unresolved Critical-priority complaints
          </h2>
          <p className="mt-2 text-sm text-ink-500">
            New critical complaints will appear here when
            recorded in the backend.
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {urgent.map((complaint) => (
            <Card key={complaint.id} className="p-0">
              <Link
                to={`/admin/complaints/${encodeURIComponent(complaint.id)}`}
                className="flex items-center gap-4 rounded-xl p-4 transition-colors hover:bg-ink-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 dark:hover:bg-ink-800/40"
              >
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-error-50 text-error-600 dark:bg-error-950/40">
                  <AlertTriangle className="h-5 w-5" />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-error-100 px-2.5 py-1 text-xs font-semibold text-error-700">
                      Critical
                    </span>
                    <span className="rounded-full bg-ink-100 px-2.5 py-1 text-xs font-medium text-ink-700 dark:bg-ink-800 dark:text-ink-200">
                      {readable(complaint.status)}
                    </span>
                    {!complaint.assignedToUserId && (
                      <span className="text-xs font-medium text-warning-600">
                        Unassigned
                      </span>
                    )}
                  </div>

                  <h2 className="mt-2 truncate text-sm font-semibold text-ink-900 dark:text-ink-100">
                    {complaint.title}
                  </h2>

                  <p className="mt-1 text-xs text-ink-500">
                    {complaint.category}
                    {' · '}
                    {complaint.departmentName ?? 'No department'}
                    {' · '}
                    {dateLabel(complaint.createdAt)}
                  </p>
                </div>

                <ArrowUpRight
                  className="h-5 w-5 shrink-0 text-ink-400"
                  aria-hidden="true"
                />
              </Link>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
