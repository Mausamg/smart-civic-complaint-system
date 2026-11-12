import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import { AdminComplaintAssignmentPanel } from '@/components/complaints/AdminComplaintAssignmentPanel';
import { AdminComplaintDepartmentPanel } from '@/components/complaints/AdminComplaintDepartmentPanel';
import { AdminComplaintPriorityPanel } from '@/components/complaints/AdminComplaintPriorityPanel';
import { CitizenComplaintDetailsOverview } from '@/components/complaints/CitizenComplaintDetailsOverview';
import { ComplaintEvidenceSection } from '@/components/complaints/ComplaintEvidenceSection';
import { StaffStatusHistoryPanel } from '@/components/complaints/StaffStatusHistoryPanel';
import { StaffStatusUpdatePanel } from '@/components/complaints/StaffStatusUpdatePanel';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { PageHeader } from '@/components/ui/PageHeader';
import { useApp } from '@/context/AppContext';

import {
  getComplaintById,
  type ComplaintApiResponse,
  type ComplaintUserSummary,
} from '@/services/complaintService';

function displayUser(user?: ComplaintUserSummary | null): string {
  if (!user) return 'Not available';

  const fullName = `${user.firstName} ${user.lastName}`.trim();
  return fullName || 'Not available';
}

export function AdminComplaintDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const { accessToken } = useApp();

  const [complaint, setComplaint] =
    useState<ComplaintApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    let cancelled = false;

    setComplaint(null);
    setLoading(true);
    setError(null);

    if (!id || !accessToken) {
      setError(
        !id
          ? 'Complaint ID is missing.'
          : 'Please sign in as an administrator.'
      );
      setLoading(false);

      return () => {
        cancelled = true;
      };
    }

    getComplaintById(id, accessToken)
      .then((data) => {
        if (!cancelled) setComplaint(data);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : 'Unable to load complaint details.'
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [id, accessToken, retryCount]);

  const breadcrumbs = [
    { label: 'Admin', to: '/admin/dashboard' },
    { label: 'Complaints', to: '/admin/complaints' },
    { label: 'Complaint Details' },
  ];

  return (
    <div>
      <PageHeader
        title={complaint?.title ?? 'Complaint Details'}
        subtitle={
          complaint
            ? `Complaint ID: ${complaint.id}`
            : 'View complaint information'
        }
        breadcrumbs={breadcrumbs}
      />

      {loading && (
        <Card className="p-6">
          <p role="status" className="text-sm text-ink-500">
            Loading complaint details...
          </p>
        </Card>
      )}

      {!loading && error && (
        <Card className="space-y-4 p-6">
          <p role="alert" className="text-sm text-error-600">
            {error}
          </p>

          {id && accessToken && (
            <Button
              variant="outline"
              onClick={() => setRetryCount((count) => count + 1)}
            >
              Retry
            </Button>
          )}

          <Link
            to="/admin/complaints"
            className="block text-sm font-medium text-primary-600"
          >
            Back to Complaints
          </Link>
        </Card>
      )}

      {!loading && !error && complaint && (
        <div className="space-y-5">
          <CitizenComplaintDetailsOverview complaint={complaint} />

          <Card className="p-5">
            <h2 className="text-base font-semibold text-ink-900 dark:text-ink-100">
              Administrative information
            </h2>

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-xs text-ink-500">Submitted by</p>
                <p className="mt-1 text-sm font-medium">
                  {displayUser(complaint.submittedBy)}
                </p>
              </div>

              <div>
                <p className="text-xs text-ink-500">Assigned staff</p>
                <p className="mt-1 text-sm font-medium">
                  {complaint.assignedTo
                    ? displayUser(complaint.assignedTo)
                    : complaint.assignedToUserId
                      ? 'Assigned'
                      : 'Unassigned'}
                </p>
              </div>

              <div>
                <p className="text-xs text-ink-500">Municipality</p>
                <p className="mt-1 text-sm font-medium">
                  {complaint.municipality || 'Not specified'}
                </p>
              </div>

              <div>
                <p className="text-xs text-ink-500">Ward</p>
                <p className="mt-1 text-sm font-medium">
                  {complaint.ward || 'Not specified'}
                </p>
              </div>
            </div>
          </Card>

          {accessToken && (
            <AdminComplaintDepartmentPanel
              complaint={complaint}
              accessToken={accessToken}
              onUpdated={() =>
                setRetryCount((count) => count + 1)
              }
            />
          )}

          {accessToken && (
            <AdminComplaintAssignmentPanel
              complaint={complaint}
              accessToken={accessToken}
              onAssigned={() =>
                setRetryCount((count) => count + 1)
              }
            />
          )}

          {accessToken && (
            <AdminComplaintPriorityPanel
              complaint={complaint}
              accessToken={accessToken}
              onUpdated={() =>
                setRetryCount((count) => count + 1)
              }
            />
          )}

          {accessToken && (
            <StaffStatusUpdatePanel
              key={`${complaint.id}:${complaint.status}`}
              complaint={complaint}
              accessToken={accessToken}
              onUpdated={() =>
                setRetryCount((count) => count + 1)
              }
            />
          )}

          {accessToken && (
            <>
              <StaffStatusHistoryPanel
                complaintId={complaint.id}
                accessToken={accessToken}
              />

              <ComplaintEvidenceSection
                complaintId={complaint.id}
                accessToken={accessToken}
              />
            </>
          )}

          <Link
            to="/admin/complaints"
            className="inline-block text-sm font-medium text-primary-600 hover:underline"
          >
            Back to all complaints
          </Link>
        </div>
      )}
    </div>
  );
}
