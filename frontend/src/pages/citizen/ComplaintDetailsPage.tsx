
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import { CitizenComplaintDetailsOverview } from '@/components/complaints/CitizenComplaintDetailsOverview';
import { ComplaintEvidenceSection } from '@/components/complaints/ComplaintEvidenceSection';
import { CitizenIncidentLocationMap } from '@/components/maps/CitizenIncidentLocationMap';
import { ComplaintConversationPanel } from '@/components/complaints/ComplaintConversationPanel';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { PageHeader } from '@/components/ui/PageHeader';

import { useApp } from '@/context/AppContext';
import {
  getComplaintById,
  setCitizenPublicMapConsent,
  type ComplaintApiResponse,
} from '@/services/complaintService';

export function ComplaintDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const { accessToken, user } = useApp();

  const [complaint, setComplaint] =
      useState<ComplaintApiResponse | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [updatingConsent, setUpdatingConsent] = useState(false);
  const [consentError, setConsentError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    setLoading(true);
    setComplaint(null);
    setError(null);

    if (!id) {
      setError('No complaint ID was provided.');
      setLoading(false);
      return;
    }

    if (!accessToken) {
      setError('Please sign in to view this complaint.');
      setLoading(false);
      return;
    }

    getComplaintById(id, accessToken)
        .then((data) => {
          if (!cancelled) {
            setComplaint(data);
          }
        })
        .catch((err: unknown) => {
          if (!cancelled) {
            setComplaint(null);
            setError(
                err instanceof Error
                    ? err.message
                    : 'Unable to load complaint details.'
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
  }, [id, accessToken, retryCount]);

  const handleConsentChange = async (optedIn: boolean) => {
    if (
      !complaint ||
      !accessToken ||
      !user ||
      user.id !== complaint.submittedByUserId ||
      updatingConsent
    ) {
      return;
    }

    setUpdatingConsent(true);
    setConsentError(null);

    try {
      const updated = await setCitizenPublicMapConsent(
        complaint.id,
        optedIn,
        accessToken
      );

      setComplaint((current) =>
        current?.id === updated.id
          ? {
              ...current,
              isPublicMapOptedIn: updated.isPublicMapOptedIn,
              isPublicMapApproved: updated.isPublicMapApproved,
            }
          : current
      );
    } catch (err: unknown) {
      setConsentError(
        err instanceof Error
          ? err.message
          : 'Unable to update public map consent.'
      );
    } finally {
      setUpdatingConsent(false);
    }
  };

  const breadcrumbs = [
    { label: 'Dashboard', to: '/citizen/dashboard' },
    { label: 'My Complaints', to: '/citizen/complaints' },
    { label: 'Details' },
  ];

  if (loading || (complaint && complaint.id !== id)) {
    return (
        <div>
          <PageHeader
              title="Complaint Details"
              subtitle="Loading complaint information"
              breadcrumbs={breadcrumbs}
          />

          <Card className="p-6">
            <p role="status" className="text-sm text-ink-500">
              Loading complaint details...
            </p>
          </Card>
        </div>
    );
  }

  if (error) {
    return (
        <div>
          <PageHeader
              title="Complaint Details"
              subtitle="Unable to load complaint"
              breadcrumbs={breadcrumbs}
          />

          <Card className="p-6">
            <h2 className="text-lg font-semibold">
              Something went wrong
            </h2>

            <p role="alert" className="mt-2 text-sm text-ink-500">
              {error}
            </p>

            <div className="mt-5 flex flex-wrap gap-3">
              {id && accessToken && (
                  <Button
                      onClick={() =>
                          setRetryCount((count) => count + 1)
                      }
                  >
                    Try again
                  </Button>
              )}

              <Link
                  to="/citizen/complaints"
                  className="inline-flex items-center text-sm font-medium text-primary-600"
              >
                Back to My Complaints
              </Link>
            </div>
          </Card>
        </div>
    );
  }

  if (!complaint) {
    return (
        <div>
          <PageHeader
              title="Complaint Not Found"
              subtitle="Complaint information is unavailable"
              breadcrumbs={breadcrumbs}
          />

          <Card className="p-6">
            <p className="text-sm text-ink-500">
              The requested complaint could not be found.
            </p>

            <Link
                to="/citizen/complaints"
                className="mt-4 inline-block text-sm font-medium text-primary-600"
            >
              Back to My Complaints
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

        <CitizenComplaintDetailsOverview complaint={complaint} />

        {accessToken && user?.id === complaint.submittedByUserId && (
          <Card className="mt-4 p-6">
            <h2 className="text-lg font-semibold text-ink-900 dark:text-ink-100">
              Public map sharing
            </h2>

            <p className="mt-2 text-sm text-ink-600 dark:text-ink-300">
              Sharing is optional. After administrator approval,
              the public map may show approximate coordinates,
              category, status, municipality, ward and date.
              Your name, full address, title, description and
              evidence are not published.
            </p>

            <label className="mt-4 flex cursor-pointer items-start gap-3 text-sm">
              <input
                type="checkbox"
                checked={complaint.isPublicMapOptedIn}
                disabled={updatingConsent}
                onChange={(event) => {
                  void handleConsentChange(event.target.checked);
                }}
                className="mt-0.5 h-4 w-4 rounded border-ink-300 text-primary-600 focus:ring-primary-500"
              />
              <span>
                I agree to share this complaint on the public map
                after administrator review.
              </span>
            </label>

            <p className="mt-3 text-sm text-ink-600 dark:text-ink-300" aria-live="polite">
              {updatingConsent
                ? 'Saving your preference...'
                : !complaint.isPublicMapOptedIn
                  ? 'Status: Private'
                  : complaint.isPublicMapApproved
                    ? 'Status: Approved for public map sharing'
                    : 'Status: Awaiting administrator approval'}
            </p>

            <p className="mt-2 text-xs text-ink-500">
              You can withdraw consent at any time.
              Changing consent clears previous administrator approval.
            </p>

            {consentError && (
              <p role="alert" className="mt-3 text-sm text-red-600">
                {consentError}
              </p>
            )}
          </Card>
        )}

        {accessToken && (
          <ComplaintConversationPanel
            complaintId={complaint.id}
            complaintStatus={complaint.status}
            accessToken={accessToken}
            currentUserId={user?.id}
          />
        )}

        {accessToken && (
          <ComplaintEvidenceSection
            complaintId={complaint.id}
            accessToken={accessToken}
          />
        )}

          <Card className="mt-4 p-6">
              <h2 className="text-lg font-semibold text-ink-900 dark:text-ink-100">
                  Incident location
              </h2>

              <dl className="mt-4 grid gap-4 sm:grid-cols-2">
                  <div>
                      <dt className="text-xs text-ink-500">
                          Municipality / Rural municipality
                      </dt>
                      <dd className="mt-1 text-sm font-medium">
                          {complaint.municipality?.trim() || 'Not provided'}
                      </dd>
                  </div>

                  <div>
                      <dt className="text-xs text-ink-500">
                          Ward
                      </dt>
                      <dd className="mt-1 text-sm font-medium">
                          {complaint.ward?.trim() || 'Not provided'}
                      </dd>
                  </div>

                  <div className="sm:col-span-2">
                      <dt className="text-xs text-ink-500">
                          Full address
                      </dt>
                      <dd className="mt-1 text-sm font-medium">
                          {complaint.location}
                      </dd>
                  </div>

                  {complaint.latitude !== null &&
                  complaint.longitude !== null ? (
                      <div className="sm:col-span-2">
                          <dt className="text-xs text-ink-500">
                              Selected map coordinates
                          </dt>
                          <dd className="mt-1 text-sm font-medium">
                              {complaint.latitude.toFixed(6)},{' '}
                              {complaint.longitude.toFixed(6)}
                          </dd>

                          <a
                              href={`https://www.openstreetmap.org/?mlat=${complaint.latitude}&mlon=${complaint.longitude}#map=17/${complaint.latitude}/${complaint.longitude}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="mt-2 inline-block text-sm font-medium text-blue-600 hover:underline"
                          >
                              View location on OpenStreetMap
                          </a>
                      </div>
                  ) : (
                      <div className="sm:col-span-2">
                          <p className="text-sm text-ink-500">
                              No map coordinates were recorded for this complaint.
                          </p>
                      </div>
                  )}
              </dl>

              <CitizenIncidentLocationMap
                  latitude={complaint.latitude}
                  longitude={complaint.longitude}
              />
          </Card>

      </div>
  );
}
