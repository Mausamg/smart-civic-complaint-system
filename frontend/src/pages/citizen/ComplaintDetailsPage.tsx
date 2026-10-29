
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import { CitizenComplaintDetailsOverview } from '@/components/complaints/CitizenComplaintDetailsOverview';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { PageHeader } from '@/components/ui/PageHeader';

import { useApp } from '@/context/AppContext';
import {
  getComplaintById,
  type ComplaintApiResponse,
} from '@/services/complaintService';

export function ComplaintDetailsPage() {
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
          </Card>

      </div>
  );
}
