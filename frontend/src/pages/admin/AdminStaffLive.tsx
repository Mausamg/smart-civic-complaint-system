import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, Building2 } from 'lucide-react';
import {
  getDepartments,
  type DepartmentApiResponse,
} from '@/services/departmentService';

import {
  getStaffWorkloads,
  type StaffWorkload,
} from '@/services/staffWorkloadService';

import { AdminStaffCreateControl } from '@/components/admin/AdminStaffCreateControl';
import { AdminStaffStatusControl } from '@/components/admin/AdminStaffStatusControl';
import { AdminStaffDepartmentControl } from '@/components/admin/AdminStaffDepartmentControl';
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

  const [departments, setDepartments] =
    useState<DepartmentApiResponse[]>([]);
  const [departmentsLoading, setDepartmentsLoading] = useState(true);
  const [departmentError, setDepartmentError] =
    useState<string | null>(null);

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

    setDepartments([]);
    setDepartmentError(null);
    setDepartmentsLoading(true);

    if (!accessToken) {
      setDepartmentsLoading(false);
      return;
    }

    getDepartments(accessToken)
      .then((data) => {
        if (!cancelled) setDepartments(data);
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setDepartmentError(
            error instanceof Error
              ? error.message
              : 'Could not load departments.'
          );
        }
      })
      .finally(() => {
        if (!cancelled) setDepartmentsLoading(false);
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

  const departmentNames = new Map(
    departments.map((department) => [
      department.id,
      department.name,
    ])
  );

  const staffDepartmentName = (person: StaffApiResponse) => {
    if (!person.departmentId) return 'Unassigned';
    if (departmentsLoading) return 'Loading...';
    if (departmentError) return 'Unavailable';

    return departmentNames.get(person.departmentId)
      ?? 'Unknown department';
  };

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
            <Card
              key={person.id}
              className="flex h-full flex-col overflow-hidden p-0 transition-colors duration-150 hover:border-primary-200 dark:hover:border-primary-800"
            >
              <div className="flex flex-1 flex-col gap-4 p-5">
                {/* Staff identity */}
                <div className="flex items-start gap-3">
                  <div
                    aria-hidden="true"
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-50 text-sm font-bold text-primary-700 dark:bg-primary-950/40 dark:text-primary-300"
                  >
                    {staffName(person).slice(0, 1).toUpperCase()}
                  </div>

                  <div className="min-w-0 flex-1">
                    <Link
                      to={`/admin/staff/${encodeURIComponent(person.id)}`}
                      className="block truncate text-sm font-semibold text-ink-900 hover:text-primary-600 focus-visible:rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 dark:text-ink-100"
                      title={staffName(person)}
                    >
                      {staffName(person)}
                    </Link>
                    <p
                      className="mt-1 truncate text-xs text-ink-500"
                      title={person.email}
                    >
                      {person.email}
                    </p>
                  </div>

                  <span
                    className={
                      person.isActive
                        ? 'shrink-0 rounded-full bg-success-100 px-2.5 py-1 text-xs font-medium text-success-700'
                        : 'shrink-0 rounded-full bg-ink-100 px-2.5 py-1 text-xs font-medium text-ink-600'
                    }
                  >
                    {person.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>

                {/* Department membership */}
                <div className="rounded-xl border border-ink-100 bg-ink-50/70 px-3.5 py-3 dark:border-ink-800 dark:bg-ink-800/40">
                  <div className="flex items-center gap-2 text-xs font-medium text-ink-500">
                    <Building2 className="h-4 w-4" aria-hidden="true" />
                    Department
                  </div>
                  <p className="mt-1.5 truncate text-sm font-semibold text-ink-900 dark:text-ink-100">
                    {staffDepartmentName(person)}
                  </p>
                </div>

                {/* Live workload metrics */}
                <section aria-label={`Workload for ${staffName(person)}`}>
                  <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-500">
                    Workload overview
                  </h3>

                  <div className="grid grid-cols-2 gap-2">
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
                        className="min-h-20 rounded-xl bg-ink-50 px-3 py-3 dark:bg-ink-800/50"
                      >
                        <p className="text-xs text-ink-500">
                          {metric.label}
                        </p>
                        <p className="mt-2 text-xl font-semibold tabular-nums text-ink-900 dark:text-ink-100">
                          {workloadsLoading
                            ? '—'
                            : workloadsError
                              ? 'N/A'
                              : metric.value}
                        </p>
                      </div>
                    ))}
                  </div>
                </section>

                {/* Compact account details */}
                <div className="mt-auto flex items-center justify-between gap-3 border-t border-ink-100 pt-3 text-xs text-ink-500 dark:border-ink-800">
                  <span>
                    Joined{' '}
                    {new Date(person.createdAtUtc).toLocaleDateString('en-GB', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </span>

                  <span
                    className="font-mono"
                    title={`Full staff ID: ${person.id}`}
                  >
                    ID: {person.id.slice(0, 8)}…
                  </span>
                </div>
              </div>

              {/* Independent footer actions */}
              <div className="space-y-3 border-t border-ink-100 bg-ink-50/40 px-5 py-3 dark:border-ink-800 dark:bg-ink-800/20">
                <Link
                  to={`/admin/staff/${encodeURIComponent(person.id)}`}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-primary-600 hover:underline dark:text-primary-400"
                >
                  View staff profile
                  <ArrowUpRight
                    className="h-3.5 w-3.5"
                    aria-hidden="true"
                  />
                </Link>

                {accessToken && (
                  <div className="flex flex-wrap items-center justify-end gap-2">
                    <AdminStaffDepartmentControl
                      staff={person}
                      departments={departments}
                      departmentsLoading={departmentsLoading}
                      departmentsError={departmentError}
                      accessToken={accessToken}
                      onUpdated={() =>
                        setRetryCount((count) => count + 1)
                      }
                    />

                    <AdminStaffStatusControl
                      staff={person}
                      accessToken={accessToken}
                      onUpdated={() =>
                        setRetryCount((count) => count + 1)
                      }
                    />
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
