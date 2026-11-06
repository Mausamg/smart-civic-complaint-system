import { useEffect, useMemo, useState } from 'react';
import {
  CircleMarker,
  MapContainer as LeafletMapContainer,
  Popup,
  TileLayer,
  useMap,
} from 'react-leaflet';
import { Link } from 'react-router-dom';
import { useApp } from '@/context/AppContext';
import { PageHeader } from '@/components/ui/PageHeader';
import {
  getAssignedComplaints,
  type ComplaintApiResponse,
} from '@/services/complaintService';

type Position = [number, number];

function FitMarkers({ positions }: { positions: Position[] }) {
  const map = useMap();

  useEffect(() => {
    if (positions.length === 1) {
      map.setView(positions[0], 14);
    } else if (positions.length > 1) {
      map.fitBounds(positions, {
        padding: [36, 36],
        maxZoom: 14,
      });
    }
  }, [map, positions]);

  return null;
}

export function StaffMapPage() {
  const { accessToken } = useApp();

  const [complaints, setComplaints] = useState<ComplaintApiResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [statusFilter, setStatusFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');

  useEffect(() => {
    let cancelled = false;

    if (!accessToken) {
      setComplaints([]);
      setError('Please sign in as a staff member.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    getAssignedComplaints(accessToken)
      .then((data) => {
        if (!cancelled) setComplaints(data);
      })
      .catch((err: unknown) => {
        if (cancelled) return;

        setComplaints([]);
        setError(
          err instanceof Error
            ? err.message
            : 'Unable to load assigned complaint locations.'
        );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [accessToken, retryCount]);

  const statuses = useMemo(
    () => [...new Set(complaints.map((c) => c.status))].sort(),
    [complaints]
  );

  const categories = useMemo(
    () => [...new Set(complaints.map((c) => c.category))].sort(),
    [complaints]
  );

  const filteredComplaints = useMemo(
    () =>
      complaints.filter(
        (complaint) =>
          (!statusFilter || complaint.status === statusFilter) &&
          (!categoryFilter || complaint.category === categoryFilter)
      ),
    [complaints, statusFilter, categoryFilter]
  );

  const locatedComplaints = useMemo(
    () =>
      filteredComplaints.filter(
        (complaint) =>
          complaint.latitude !== null &&
          complaint.longitude !== null &&
          Number.isFinite(complaint.latitude) &&
          Number.isFinite(complaint.longitude) &&
          Math.abs(complaint.latitude) <= 90 &&
          Math.abs(complaint.longitude) <= 180
      ),
    [filteredComplaints]
  );

  const locatedIds = useMemo(
    () => new Set(locatedComplaints.map((c) => c.id)),
    [locatedComplaints]
  );

  const positions = useMemo<Position[]>(
    () =>
      locatedComplaints.map((complaint) => [
        complaint.latitude!,
        complaint.longitude!,
      ]),
    [locatedComplaints]
  );

  return (
    <div>
      <PageHeader
        title="Staff Complaint Map"
        subtitle="Explore locations of your active assigned complaints."
        breadcrumbs={[
          { label: 'Dashboard', to: '/staff/dashboard' },
          { label: 'Map View' },
        ]}
      />

      {loading ? (
        <p role="status" className="py-8 text-center text-ink-500">
          Loading assigned complaint locations...
        </p>
      ) : error ? (
        <div role="alert" className="rounded-xl border border-ink-200 p-5">
          <p className="mb-3 text-sm text-ink-600">{error}</p>
          <button
            type="button"
            onClick={() => setRetryCount((count) => count + 1)}
            className="rounded-lg bg-primary-600 px-4 py-2 text-sm text-white"
          >
            Try again
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex flex-wrap items-end gap-3 rounded-xl border border-ink-200 p-4">
            <label className="flex min-w-40 flex-col gap-1 text-sm">
              <span className="font-medium">Status</span>
              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                className="rounded-lg border border-ink-200 bg-white px-3 py-2 text-ink-700"
              >
                <option value="">All statuses</option>
                {statuses.map((status) => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </select>
            </label>

            <label className="flex min-w-40 flex-col gap-1 text-sm">
              <span className="font-medium">Category</span>
              <select
                value={categoryFilter}
                onChange={(event) => setCategoryFilter(event.target.value)}
                className="rounded-lg border border-ink-200 bg-white px-3 py-2 text-ink-700"
              >
                <option value="">All categories</option>
                {categories.map((category) => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
            </label>

            <button
              type="button"
              disabled={!statusFilter && !categoryFilter}
              onClick={() => {
                setStatusFilter('');
                setCategoryFilter('');
              }}
              className="rounded-lg border border-ink-200 px-4 py-2 text-sm font-medium disabled:opacity-50"
            >
              Clear filters
            </button>
          </div>

          <div className="rounded-xl border border-ink-200 p-4 text-sm text-ink-600">
            <p>
              <strong>{locatedComplaints.length}</strong> mapped complaints
              {' '}out of <strong>{filteredComplaints.length}</strong> matching assignments
              {' '}({complaints.length} active assignments in total).
            </p>

            {filteredComplaints.length > locatedComplaints.length && (
              <p className="mt-2 text-xs text-ink-500">
                Some assigned complaints have no valid coordinates and
                cannot be placed on the map.
              </p>
            )}
          </div>

          <div className="grid gap-4 xl:grid-cols-3">
            <div className="min-w-0 xl:col-span-2">
          {locatedComplaints.length === 0 ? (
            <div className="rounded-xl border border-ink-200 p-8 text-center">
              <p className="font-medium text-ink-700">
                {filteredComplaints.length === 0
                  ? 'No complaints match these filters.'
                  : 'No assigned complaint locations to display.'}
              </p>
              <p className="mt-2 text-sm text-ink-500">
                Complaints need valid coordinates to appear on the map.
              </p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-ink-200">
              <LeafletMapContainer
                center={[27.7172, 85.3249]}
                zoom={8}
                scrollWheelZoom
                className="h-[560px] w-full"
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                <FitMarkers positions={positions} />

                {locatedComplaints.map((complaint) => (
                  <CircleMarker
                    key={complaint.id}
                    center={[
                      complaint.latitude!,
                      complaint.longitude!,
                    ]}
                    radius={9}
                    pathOptions={{
                      color: '#ffffff',
                      weight: 2,
                      fillColor: '#2563eb',
                      fillOpacity: 0.9,
                    }}
                  >
                    <Popup>
                      <div className="space-y-2">
                        <strong>{complaint.title}</strong>
                        <p>{complaint.location}</p>
                        <p>Status: {complaint.status}</p>
                        <p>Priority: {complaint.priority}</p>
                        <Link
                          to={`/staff/complaints/${encodeURIComponent(complaint.id)}`}
                          className="font-medium text-blue-700 underline"
                        >
                          View complaint
                        </Link>
                      </div>
                    </Popup>
                  </CircleMarker>
                ))}
              </LeafletMapContainer>
            </div>
          )}
            </div>

            <section
              aria-label="Matching assigned complaints"
              className="rounded-2xl border border-ink-200 p-4"
            >
              <div className="mb-4 flex items-center justify-between">
                <h2 className="font-semibold text-ink-900">
                  Matching complaints</h2>
                <span className="text-sm text-ink-500">
                  {filteredComplaints.length}
                </span>
              </div>

              {filteredComplaints.length === 0 ? (
                <p className="text-sm text-ink-500">
                  No complaints match the selected filters.
                </p>
              ) : (
                <ul className="max-h-[560px] space-y-3 overflow-y-auto">
                  {filteredComplaints.map((complaint) => (
                    <li key={complaint.id}>
                      <Link
                        to={`/staff/complaints/${encodeURIComponent(complaint.id)}`}
                        className="block rounded-xl border border-ink-200 p-3 transition hover:border-primary-400 hover:bg-primary-50"
                      >
                        <h3 className="break-words text-sm font-semibold text-ink-900">
                          {complaint.title}
                        </h3>

                        <p className="mt-2 text-xs text-ink-500">
                          {complaint.category} · {complaint.status}
                        </p>

                        <p className="mt-1 text-xs text-ink-600">
                          {complaint.location}
                        </p>

                        {!locatedIds.has(complaint.id) && (
                          <p className="mt-2 text-xs text-amber-700">
                            No valid map coordinates
                          </p>
                        )}

                        <span className="mt-3 inline-block text-xs font-medium text-primary-600">
                          View complaint →
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        </div>
      )}
    </div>
  );
}
