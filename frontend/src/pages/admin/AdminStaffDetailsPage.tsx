import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { PageHeader } from '@/components/ui/PageHeader';
import { useApp } from '@/context/AppContext';

import {
  getAllStaff,
  getStaffPerformance,
  type StaffApiResponse,
  type StaffPerformanceResponse,
} from '@/services/staffService';

function formatMinutes(value: number | null): string {
  if (value === null || !Number.isFinite(value)) {
    return 'N/A';
  }

  const minutes = Math.max(0, Math.round(value));

  if (minutes < 60) {
    return `${minutes} min`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (hours < 24) {
    return `${hours}h ${remainingMinutes}m`;
  }

  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;

  return `${days}d ${remainingHours}h`;
}

function formatDate(value: string | null): string {
  if (!value) return 'N/A';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return 'N/A';
  }

  return date.toLocaleString('en-GB', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

function formatStatus(value: string): string {
  return value.replace(/([a-z])([A-Z])/g, '$1 $2');
}

export function AdminStaffDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const { accessToken } = useApp();

  const [staff, setStaff] =
    useState<StaffApiResponse | null>(null);

  const [performance, setPerformance] =
    useState<StaffPerformanceResponse | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    let cancelled = false;

    setLoading(true);
    setError(null);
    setStaff(null);
    setPerformance(null);

    if (!accessToken || !id) {
      setError('A valid admin session and staff ID are required.');
      setLoading(false);
      return;
    }

    const load = async () => {
      try {
        const [staffList, details] = await Promise.all([
          getAllStaff(accessToken),
          getStaffPerformance(id, accessToken),
        ]);

        const selectedStaff = staffList.find(
          (person) =>
            person.id.toLowerCase() === id.toLowerCase()
        );

        if (!selectedStaff) {
          throw new Error('Staff account not found.');
        }

        if (!cancelled) {
          setStaff(selectedStaff);
          setPerformance(details);
        }
      } catch (err: unknown) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : 'Unable to load staff performance.'
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [accessToken, id, retryCount]);

  const staffName = staff
    ? `${staff.firstName} ${staff.lastName}`.trim()
    : 'Staff Details';

  const metrics = performance
    ? [
        {
          label: 'Currently assigned',
          value: String(performance.currentlyAssigned),
        },
        {
          label: 'Lifetime assigned',
          value: String(performance.lifetimeAssigned),
        },
        {
          label: 'Resolved by staff',
          value: String(performance.resolvedByStaff),
        },
        {
          label: 'Avg first response',
          value: formatMinutes(
            performance.averageFirstActionMinutes
          ),
        },
        {
          label: 'Avg resolution time',
          value: formatMinutes(
            performance.averageResolutionMinutes
          ),
        },
      ]
    : [];

  return (
    <div>
      <PageHeader
        title={staffName}
        subtitle="Staff profile, workload, and complaint history."
        breadcrumbs={[
          { label: 'Admin', to: '/admin/dashboard' },
          { label: 'Staff', to: '/admin/staff' },
          { label: 'Details' },
        ]}
      />

      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <Link
          to="/admin/staff"
          className="text-sm font-medium text-primary-600 hover:underline"
        >
          Back to Staff Management
        </Link>

        <Button
          size="sm"
          variant="outline"
          disabled={loading}
          onClick={() => setRetryCount((count) => count + 1)}
        >
          Refresh details
        </Button>
      </div>

      {loading ? (
        <Card className="p-6">
          <p role="status" className="text-sm text-ink-500">
            Loading staff performance from the backend...
          </p>
        </Card>
      ) : error ? (
        <Card className="space-y-4 p-6">
          <p role="alert" className="text-sm text-error-600">
            {error}
          </p>

          <Button
            onClick={() => setRetryCount((count) => count + 1)}
          >
            Try again
          </Button>
        </Card>
      ) : staff && performance ? (
        <div className="space-y-6">
          <Card className="overflow-hidden">
            <div className="h-1.5 bg-gradient-to-r from-primary-600 via-sky-500 to-cyan-400" />

            <div className="p-6 sm:p-7">
              <div className="flex flex-wrap items-start justify-between gap-5">
                <div className="flex min-w-0 items-center gap-4">
                  <div
                    aria-hidden="true"
                    className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-primary-100 text-xl font-bold text-primary-700 dark:bg-primary-900/40 dark:text-primary-300"
                  >
                    {`${staff.firstName.slice(0, 1)}${staff.lastName.slice(0, 1)}`.toUpperCase()}
                  </div>

                  <div className="min-w-0">
                    <p className="text-xs font-bold uppercase tracking-widest text-primary-600">
                      Staff profile
                    </p>

                    <h2 className="mt-1 break-words text-2xl font-bold tracking-tight text-ink-900 dark:text-ink-100">
                      {staffName}
                    </h2>

                    <a
                      href={`mailto:${staff.email}`}
                      className="mt-1 block break-all text-sm text-ink-500 hover:text-primary-600 hover:underline"
                    >
                      {staff.email}
                    </a>
                  </div>
                </div>

                <span
                  className={
                    staff.isActive
                      ? 'inline-flex items-center rounded-full bg-success-100 px-3 py-1.5 text-xs font-semibold text-success-700'
                      : 'inline-flex items-center rounded-full bg-ink-100 px-3 py-1.5 text-xs font-semibold text-ink-600'
                  }
                >
                  {staff.isActive ? 'Active account' : 'Inactive account'}
                </span>
              </div>

              <div className="mt-6 grid gap-4 border-t border-ink-100 pt-5 dark:border-ink-800 sm:grid-cols-2">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-ink-400">
                    Member since
                  </p>

                  <p className="mt-1 text-sm font-medium text-ink-800 dark:text-ink-200">
                    {formatDate(staff.createdAtUtc)}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-ink-400">
                    Staff identifier
                  </p>

                  <p className="mt-1 break-all font-mono text-xs text-ink-600 dark:text-ink-300">
                    {staff.id}
                  </p>
                </div>
              </div>
            </div>
          </Card>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-5">
            {metrics.map((metric, index) => (
              <Card
                key={metric.label}
                className="p-5 transition-shadow duration-200 hover:shadow-md"
              >
                <div className="flex items-center gap-2">
                  <span
                    aria-hidden="true"
                    className={
                      index === 2
                        ? 'h-2 w-2 rounded-full bg-emerald-500'
                        : 'h-2 w-2 rounded-full bg-primary-500'
                    }
                  />

                  <p className="text-xs font-medium text-ink-500">
                    {metric.label}
                  </p>
                </div>

                <p className="mt-4 text-3xl font-bold tracking-tight tabular-nums text-ink-900 dark:text-ink-100">
                  {metric.value}
                </p>
              </Card>
            ))}
          </div>

          <Card className="p-5">
            <h2 className="text-base font-semibold text-ink-900 dark:text-ink-100">
              How performance is measured
            </h2>

            <p className="mt-2 text-sm text-ink-600 dark:text-ink-300">
              First response is measured from assignment to the
              first staff-authored comment or status update.
              Resolution time is measured from assignment to
              that staff member's recorded resolution.
              Automatic assignment-related status changes
              are not counted as staff responses.
            </p>

            <p className="mt-2 text-xs text-ink-500">
              N/A means no qualifying recorded event exists.
              Historical metrics are based on available
              assignment and activity records.
            </p>
          </Card>

          <Card className="overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-4 p-5 sm:p-6">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-primary-600">
                  Activity history
                </p>

                <h2 className="mt-1 text-lg font-bold text-ink-900 dark:text-ink-100">
                  Complaint Assignments
                </h2>

                <p className="mt-1 text-sm text-ink-500">
                  Recorded work and assignment history for this staff member.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-ink-100 px-3 py-1.5 text-xs font-semibold text-ink-700 dark:bg-ink-800 dark:text-ink-200">
                  {performance.assignments.length} periods
                </span>

                <span className="rounded-full bg-primary-50 px-3 py-1.5 text-xs font-semibold text-primary-700 dark:bg-primary-900/30 dark:text-primary-300">
                  {performance.assignments.filter(
                    (activity) => activity.isCurrentlyAssigned
                  ).length} current
                </span>
              </div>
            </div>

            {performance.assignments.length === 0 ? (
              <div className="border-t border-ink-100 px-6 py-12 text-center dark:border-ink-800">
                <p className="text-sm font-semibold text-ink-700 dark:text-ink-200">
                  No recorded assignments
                </p>

                <p className="mt-2 text-sm text-ink-500">
                  Assignment history will appear here when records are available.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto border-t border-ink-100 dark:border-ink-800">
                <table className="w-full min-w-[1000px] text-left text-sm">
                  <thead className="bg-ink-50/90 dark:bg-ink-800/60">
                    <tr className="text-xs uppercase tracking-wide text-ink-500">
                      <th scope="col" className="px-5 py-4 font-semibold">
                        Complaint
                      </th>

                      <th scope="col" className="px-4 py-4 font-semibold">
                        Status
                      </th>

                      <th scope="col" className="px-4 py-4 font-semibold">
                        Assigned
                      </th>

                      <th scope="col" className="px-4 py-4 font-semibold">
                        First response
                      </th>

                      <th scope="col" className="px-4 py-4 font-semibold">
                        Resolution
                      </th>

                      <th scope="col" className="px-5 py-4 font-semibold">
                        Assignment
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-ink-100 dark:divide-ink-800">
                    {performance.assignments.map((activity) => (
                      <tr
                        key={activity.assignmentId}
                        className="transition-colors hover:bg-ink-50/70 dark:hover:bg-ink-800/30"
                      >
                        <td className="max-w-[280px] px-5 py-4 align-top">
                          <Link
                            to={`/admin/complaints/${encodeURIComponent(activity.complaintId)}`}
                            className="font-semibold leading-6 text-primary-600 hover:text-primary-700 hover:underline"
                          >
                            {activity.complaintTitle}
                          </Link>

                          <p className="mt-1 font-mono text-xs text-ink-400">
                            ID: {activity.complaintId.slice(0, 8)}
                          </p>
                        </td>

                        <td className="px-4 py-4 align-top">
                          <span
                            className={
                              'inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ' +
                              (
                                activity.currentStatus === 'Resolved'
                                  ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                                  : activity.currentStatus === 'InProgress'
                                    ? 'bg-sky-50 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300'
                                    : activity.currentStatus === 'UnderReview'
                                      ? 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'
                                      : 'bg-ink-100 text-ink-700 dark:bg-ink-800 dark:text-ink-300'
                              )
                            }
                          >
                            {formatStatus(activity.currentStatus)}
                          </span>
                        </td>

                        <td className="px-4 py-4 align-top text-sm text-ink-600 dark:text-ink-300">
                          {formatDate(activity.assignedAtUtc)}
                        </td>

                        <td className="px-4 py-4 align-top">
                          <p className="font-semibold tabular-nums text-ink-900 dark:text-ink-100">
                            {formatMinutes(activity.firstActionMinutes)}
                          </p>

                          {activity.firstActionAtUtc && (
                            <p className="mt-1 text-xs text-ink-500">
                              {formatDate(activity.firstActionAtUtc)}
                            </p>
                          )}
                        </td>

                        <td className="px-4 py-4 align-top">
                          <p className="font-semibold tabular-nums text-ink-900 dark:text-ink-100">
                            {formatMinutes(activity.resolutionMinutes)}
                          </p>

                          {activity.resolvedAtUtc && (
                            <p className="mt-1 text-xs text-ink-500">
                              {formatDate(activity.resolvedAtUtc)}
                            </p>
                          )}
                        </td>

                        <td className="px-5 py-4 align-top">
                          <span
                            className={
                              activity.isCurrentlyAssigned
                                ? 'inline-flex rounded-full bg-primary-50 px-3 py-1 text-xs font-semibold text-primary-700 dark:bg-primary-900/30 dark:text-primary-300'
                                : 'inline-flex rounded-full bg-ink-100 px-3 py-1 text-xs font-semibold text-ink-600 dark:bg-ink-800 dark:text-ink-300'
                            }
                          >
                            {activity.isCurrentlyAssigned
                              ? 'Current'
                              : 'Previous'}
                          </span>

                          {activity.reassignedAtUtc && (
                            <p className="mt-2 text-xs text-ink-500">
                              Ended {formatDate(activity.reassignedAtUtc)}
                            </p>
                          )}

                          {activity.resolvedByStaff && (
                            <p className="mt-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                              Resolved by this staff
                            </p>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="border-t border-ink-100 bg-ink-50/50 px-5 py-3 dark:border-ink-800 dark:bg-ink-800/20">
              <p className="text-xs text-ink-500">
                Response and resolution times are based on recorded staff actions.
                N/A means no qualifying event was recorded.
              </p>
            </div>
          </Card>
        </div>
      ) : null}
    </div>
  );
}
