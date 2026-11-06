import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

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
} from '@/services/complaintService';

export function StaffComplaintDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const { accessToken } = useApp();

  const [complaint, setComplaint] =
    useState<ComplaintApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    let cancelled = false;

    setLoading(true);
    setComplaint(null);
    setError(null);

    if (!id || !accessToken) {
      setError(
        !id
          ? 'Complaint ID is missing.'
          : 'Please sign in to view this complaint.'
      );
      setLoading(false);
      return;
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
    { label: 'Dashboard', to: '/staff/dashboard' },
    { label: 'Assigned', to: '/staff/assigned' },
    { label: 'Complaint Details' },
  ];

  if (loading || (complaint && complaint.id !== id)) {
    return (
      <div>
        <PageHeader
          title="Complaint Details"
          breadcrumbs={breadcrumbs}
        />
        <Card className="p-6">
          <p role="status">Loading complaint details...</p>
        </Card>
      </div>
    );
  }

  if (error || !complaint) {
    return (
      <div>
        <PageHeader
          title="Complaint Details"
          breadcrumbs={breadcrumbs}
        />
        <Card className="space-y-4 p-6">
          <p role="alert" className="text-sm text-error-600">
            {error ?? 'Complaint not found.'}
          </p>

          {id && accessToken && (
            <Button onClick={() => setRetryCount(n => n + 1)}>
              Try again
            </Button>
          )}

          <Link
            to="/staff/assigned"
            className="block text-sm text-primary-600"
          >
            Back to Assigned Complaints
          </Link>
        </Card>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title={complaint.title}
        subtitle={`Complaint ID: ${complaint.id}`}
        breadcrumbs={breadcrumbs}
      />

      {accessToken && (
        <StaffStatusUpdatePanel
          complaint={complaint}
          accessToken={accessToken}
          onUpdated={() => setRetryCount((count) => count + 1)}
        />
      )}

      <CitizenComplaintDetailsOverview complaint={complaint} />

      {accessToken && (
        <StaffStatusHistoryPanel
          complaintId={complaint.id}
          accessToken={accessToken}
        />
      )}

      <Card className="mt-4 p-5">
        <h2 className="text-lg font-semibold">
          Incident location
        </h2>

        <dl className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-xs text-ink-500">
              Municipality
            </dt>
            <dd className="mt-1 text-sm">
              {complaint.municipality || 'Not specified'}
            </dd>
          </div>

          <div>
            <dt className="text-xs text-ink-500">
              Ward
            </dt>
            <dd className="mt-1 text-sm">
              {complaint.ward || 'Not specified'}
            </dd>
          </div>
        </dl>
      </Card>

      {accessToken && (
        <ComplaintEvidenceSection
          complaintId={complaint.id}
          accessToken={accessToken}
        />
      )}
    </div>
  );
}
