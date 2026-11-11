import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { AdminComplaintAssignmentPanel } from '@/components/complaints/AdminComplaintAssignmentPanel';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { PageHeader } from '@/components/ui/PageHeader';
import { useApp } from '@/context/AppContext';
import {
  getAdminComplaints,
  type ComplaintApiResponse,
} from '@/services/complaintService';

const eligibleStatuses = [
  'submitted',
  'underreview',
  'inprogress',
];

function isEligible(complaint: ComplaintApiResponse): boolean {
  const status = complaint.status
    .replace(/[^a-z]/gi, '')
    .toLowerCase();

  return (
    !complaint.assignedToUserId &&
    eligibleStatuses.includes(status)
  );
}

function displayStatus(status: string): string {
  return status.replace(/([a-z])([A-Z])/g, '$1 $2');
}

export function AdminAssignmentLive() {
  const { accessToken } = useApp();

  const [complaints, setComplaints] =
    useState<ComplaintApiResponse[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    let cancelled = false;

    setLoading(true);
    setError(null);
    setComplaints([]);

    if (!accessToken) {
      setError('Please sign in as an administrator.');
      setLoading(false);
      return;
    }

    const load = async () => {
      try {
        const first = await getAdminComplaints(accessToken, {
          page: 1,
          pageSize: 100,
        });

        const all = [...first.items];

        for (let page = 2; page <= first.totalPages; page++) {
          if (cancelled) return;

          const result = await getAdminComplaints(accessToken, {
            page,
            pageSize: 100,
          });

          all.push(...result.items);
        }

        if (!cancelled) {
          setComplaints(all);
        }
      } catch (err: unknown) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : 'Unable to load the assignment queue.'
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [accessToken, retryCount]);

  const queue = complaints.filter(isEligible);

  const selected =
    queue.find((complaint) => complaint.id === selectedId) ??
    queue[0];

  const handleAssigned = () => {
    setSelectedId('');
    setRetryCount((count) => count + 1);
  };

  return (
    <div>
      <PageHeader
        title="Complaint Assignment"
        subtitle="Assign unassigned complaints to active staff members."
        breadcrumbs={[
          { label: 'Admin', to: '/admin/dashboard' },
          { label: 'Assignment' },
        ]}
      />

      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-ink-500">
          {loading
            ? 'Loading assignment queue...'
            : `${queue.length} eligible unassigned complaints`}
        </p>

        <Button
          size="sm"
          variant="outline"
          disabled={loading}
          onClick={() => setRetryCount((count) => count + 1)}
        >
          Refresh queue
        </Button>
      </div>

      {loading ? (
        <Card className="p-6">
          <p role="status" className="text-sm text-ink-500">
            Loading complaints from the backend...
          </p>
        </Card>
      ) : error ? (
        <Card className="space-y-4 p-6">
          <p role="alert" className="text-sm text-error-600">
            {error}
          </p>

          <Button onClick={() => setRetryCount((count) => count + 1)}>
            Try again
          </Button>
        </Card>
      ) : queue.length === 0 ? (
        <Card className="p-8 text-center">
          <h2 className="font-semibold">
            No eligible unassigned complaints
          </h2>
          <p className="mt-2 text-sm text-ink-500">
            All currently eligible complaints have been assigned.
          </p>
        </Card>
      ) : (
        <div className="grid gap-6 lg:grid-cols-5">
          <div className="space-y-3 lg:col-span-2">
            <h2 className="text-sm font-semibold">
              Unassigned queue ({queue.length})
            </h2>

            <div className="max-h-[750px] space-y-2 overflow-y-auto pr-1">
              {queue.map((complaint) => (
                <button
                  key={complaint.id}
                  type="button"
                  onClick={() => setSelectedId(complaint.id)}
                  className={`w-full rounded-xl border p-4 text-left transition ${
                    selected.id === complaint.id
                      ? 'border-primary-500 bg-primary-50/50 dark:bg-primary-950/20'
                      : 'border-ink-200 hover:border-primary-300 dark:border-ink-700'
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-ink-500">
                    <span>{complaint.category}</span>
                    <span>{complaint.priority} priority</span>
                  </div>

                  <p className="mt-2 text-sm font-semibold text-ink-900 dark:text-ink-100">
                    {complaint.title}
                  </p>

                  <p className="mt-1 text-xs text-ink-500">
                    {displayStatus(complaint.status)} · {complaint.location}
                  </p>

                  <p className="mt-1 text-xs text-ink-400">
                    ID: {complaint.id.slice(0, 8)}
                  </p>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-4 lg:col-span-3">
            <Card className="p-5">
              <h2 className="text-base font-semibold text-ink-900 dark:text-ink-100">
                {selected.title}
              </h2>

              <p className="mt-2 text-sm text-ink-600 dark:text-ink-300">
                {selected.description}
              </p>

              <div className="mt-3 space-y-1 text-xs text-ink-500">
                <p>Category: {selected.category}</p>
                <p>Status: {displayStatus(selected.status)}</p>
                <p>Priority: {selected.priority}</p>
                <p>Location: {selected.location}</p>
              </div>

              <Link
                to={`/admin/complaints/${encodeURIComponent(selected.id)}`}
                className="mt-4 inline-block text-sm font-medium text-primary-600 hover:underline"
              >
                View full complaint details
              </Link>
            </Card>

            {accessToken && (
              <AdminComplaintAssignmentPanel
                key={selected.id}
                complaint={selected}
                accessToken={accessToken}
                onAssigned={handleAssigned}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
