import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import {
  getStaffWorkloads,
  type StaffWorkload,
} from '@/services/staffWorkloadService';

import { AdminStaffCreateControl } from '@/components/admin/AdminStaffCreateControl';
import { AdminStaffStatusControl } from '@/components/admin/AdminStaffStatusControl';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { PageHeader } from '@/components/ui/PageHeader';
import { useApp } from '@/context/AppContext';
import {
  getAllStaff,
  type StaffApiResponse,
} from '@/services/staffService';

type StaffFilter = 'all' | 'active' | 'inactive';

function staffName(staff: StaffApiResponse): string {
  return (
    `${staff.firstName} ${staff.lastName}`.trim() ||
    staff.email
  );
}

export function AdminStaffLive() {
  const { accessToken } = useApp();

  const [staff, setStaff] = useState<StaffApiResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [filter, setFilter] = useState<StaffFilter>('all');

  const [workloads, setWorkloads] = useState<
    Record<string, StaffWorkload>
  >({});
  const [workloadsLoading, setWorkloadsLoading] = useState(true);
  const [workloadsError, setWorkloadsError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    setLoading(true);
    setError(null);
    setStaff([]);

    if (!accessToken) {
      setError('Please sign in as an administrator.');
      setLoading(false);
      return;
    }

    getAllStaff(accessToken)
      .then((data) => {
        if (!cancelled) {
          setStaff(data);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : 'Unable to load staff accounts.'
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

  useEffect(() => {
    let cancelled = false;

    setWorkloadsLoading(true);
    setWorkloadsError(null);
    setWorkloads({});

    if (!accessToken) {
      setWorkloadsError('Please sign in as an administrator.');
      setWorkloadsLoading(false);
      return;
    }

    getStaffWorkloads(accessToken)
      .then((data) => {
        if (!cancelled) {
          setWorkloads(data);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setWorkloadsError(
            err instanceof Error
              ? err.message
              : 'Unable to load staff workloads.'
          );
        }
      })
      .finally(() => {
        if (!cancelled) {
          setWorkloadsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [accessToken, retryCount]);

  const activeCount = staff.filter(
    (person) => person.isActive
  ).length;

  const inactiveCount = staff.length - activeCount;

  const filteredStaff = staff.filter((person) => {
    if (filter === 'active') return person.isActive;
    if (filter === 'inactive') return !person.isActive;
    return true;
  });

  return (
    <div>
      <PageHeader
        title="Staff Management"
        subtitle="Manage real staff accounts registered in CivicLink."
        breadcrumbs={[
          { label: 'Admin', to: '/admin/dashboard' },
          { label: 'Staff' },
        ]}
      />

      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        {[
          { label: 'Total staff', value: staff.length },
          { label: 'Active staff', value: activeCount },
          { label: 'Inactive staff', value: inactiveCount },
        ].map((item) => (
          <Card key={item.label} className="p-4">
            <p className="text-xs text-ink-500">
              {item.label}
            </p>
            <p className="mt-2 text-2xl font-semibold text-ink-900 dark:text-ink-100">
              {loading ? '—' : item.value}
            </p>
          </Card>
        ))}
      </div>

      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <label className="flex items-center gap-2 text-sm text-ink-600">
          <span>Show</span>

          <select
            value={filter}
            onChange={(event) =>
              setFilter(event.target.value as StaffFilter)
            }
            className="rounded-lg border border-ink-200 bg-white px-3 py-2 text-ink-700 dark:border-ink-700 dark:bg-ink-900 dark:text-ink-200"
          >
            <option value="all">All staff</option>
            <option value="active">Active staff</option>
            <option value="inactive">Inactive staff</option>
          </select>
        </label>

        <div className="flex flex-wrap items-center gap-2">
          {accessToken && (
            <AdminStaffCreateControl
              accessToken={accessToken}
              onCreated={() =>
                setRetryCount((count) => count + 1)
              }
            />
          )}

          <Button
            size="sm"
            variant="outline"
            disabled={loading}
            onClick={() => setRetryCount((count) => count + 1)}
          >
            Refresh staff
          </Button>
        </div>
      </div>

      {!loading && !error && workloadsError && (
        <Card className="mb-4 p-4">
          <p role="alert" className="text-sm text-error-600">
            Workload statistics are unavailable: {workloadsError}
          </p>
        </Card>
      )}

      {loading ? (
        <Card className="p-6">
          <p role="status" className="text-sm text-ink-500">
            Loading staff accounts...
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
      ) : filteredStaff.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-sm text-ink-500">
            No staff accounts match the selected filter.
          </p>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredStaff.map((person) => (
            <Card key={person.id} className="p-5 group relative cursor-pointer transition-all duration-200 hover:-translate-y-0.5 hover:border-primary-300 hover:shadow-lg dark:hover:border-primary-700">
              <Link
                to={`/admin/staff/${encodeURIComponent(person.id)}`}
                aria-label={`Open staff profile for ${person.firstName} ${person.lastName}`}
                className="absolute inset-0 z-10 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2"
              />

              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="break-words text-sm font-semibold text-ink-900 dark:text-ink-100">
                    {staffName(person)}
                  </h2>
                  <p className="mt-1 break-all text-xs text-ink-500">
                    {person.email}
                  </p>
                </div>

                <span
                  className={
                    person.isActive
                      ? 'shrink-0 rounded-full bg-success-100 px-2 py-1 text-xs font-medium text-success-700'
                      : 'shrink-0 rounded-full bg-ink-100 px-2 py-1 text-xs font-medium text-ink-600'
                  }
                >
                  {person.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2">
                {[
                  {
                    label: 'Total assigned',
                    value: workloads[person.id.trim().toLowerCase()]
                      ?.totalAssigned ?? 0,
                  },
                  {
                    label: 'Active assigned',
                    value: workloads[person.id.trim().toLowerCase()]
                      ?.activeAssigned ?? 0,
                  },
                  {
                    label: 'In progress',
                    value: workloads[person.id.trim().toLowerCase()]
                      ?.inProgress ?? 0,
                  },
                  {
                    label: 'Resolved',
                    value: workloads[person.id.trim().toLowerCase()]
                      ?.resolved ?? 0,
                  },
                ].map((metric) => (
                  <div
                    key={metric.label}
                    className="rounded-lg bg-ink-50 p-3 dark:bg-ink-800/50"
                  >
                    <p className="text-xs text-ink-500">
                      {metric.label}
                    </p>
                    <p className="mt-1 text-lg font-semibold text-ink-900 dark:text-ink-100">
                      {workloadsLoading
                        ? '—'
                        : workloadsError
                          ? 'N/A'
                          : metric.value}
                    </p>
                  </div>
                ))}
              </div>

              <div className="mt-4 border-t border-ink-100 pt-3 text-xs text-ink-500 dark:border-ink-800">
                <p>
                  Created:{' '}
                  {new Date(person.createdAtUtc).toLocaleDateString('en-GB')}
                </p>
                <p className="mt-1 break-all">
                  Staff ID: {person.id}
                </p>
              </div>

              {accessToken && (
                <div className="relative z-20 mt-4 flex flex-wrap items-center justify-end gap-2 border-t border-ink-100 pt-3 dark:border-ink-800">
                  <AdminStaffStatusControl
                    staff={person}
                    accessToken={accessToken}
                    onUpdated={() =>
                      setRetryCount((count) => count + 1)
                    }
                  />
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
