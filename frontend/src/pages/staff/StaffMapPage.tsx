import { useEffect, useMemo, useRef, useState } from 'react';
import type {
  CircleMarker as LeafletCircleMarker,
  Map as LeafletMap,
} from 'leaflet';
import {
  CircleMarker,
  MapContainer as LeafletMapContainer,
  Popup,
  TileLayer,
  useMap,
} from 'react-leaflet';
import {
  LiveComplaintCard,
  LiveComplaintSummary,
  LiveComplaintPriorityBadge,
  LiveComplaintDetailsLink,
  type LiveComplaintSummaryData,
} from '@/components/complaints/LiveComplaintCard';
import { useApp } from '@/context/AppContext';
import { PageHeader } from '@/components/ui/PageHeader';
import {
  getAssignedComplaints,
  type ComplaintApiResponse,
} from '@/services/complaintService';

type Position = [number, number];

function complaintDetailsPath(id: string): string {
  return `/staff/complaints/${encodeURIComponent(id)}`;
}

function toSummaryData(
  complaint: ComplaintApiResponse
): LiveComplaintSummaryData {
  const municipality =
    complaint.municipality?.trim() || 'Not specified';

  return {
    id: complaint.id,
    title: complaint.title,
    category: complaint.category,
    status: complaint.status,
    priority: complaint.priority,
    location: complaint.location,
    createdAt: complaint.createdAt,
    updatedAt: complaint.updatedAt,
    departmentLabel: complaint.departmentId
      ? complaint.departmentName?.trim()
        || 'Department name unavailable'
      : 'No department',
    municipalityLabel: complaint.ward
      ? `${municipality} · Ward ${complaint.ward}`
      : municipality,
  };
}

function fitStaffLocations(
  map: LeafletMap,
  positions: Position[]
) {
  if (positions.length === 1) {
    map.setView(positions[0], 14);
  } else if (positions.length > 1) {
    map.fitBounds(positions, {
      padding: [36, 36],
      maxZoom: 14,
    });
  }
}

function FitMarkers({ positions }: { positions: Position[] }) {
  const map = useMap();

  useEffect(() => {
    fitStaffLocations(map, positions);
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
  const [selectedComplaintId, setSelectedComplaintId] =
    useState<string | null>(null);

  const mapRef = useRef<LeafletMap | null>(null);
  const markerRefs = useRef(
    new Map<string, LeafletCircleMarker>()
  );

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

  const focusComplaint = (complaint: ComplaintApiResponse) => {
    if (!locatedIds.has(complaint.id)) return;

    const position: Position = [
      complaint.latitude!,
      complaint.longitude!,
    ];

    setSelectedComplaintId(complaint.id);

    const map = mapRef.current;

    if (map) {
      map.flyTo(
        position,
        Math.max(15, map.getZoom()),
        { duration: 0.5 }
      );
    }

    markerRefs.current.get(complaint.id)?.openPopup();
  };

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

          <div className="flex justify-end">
            <button
              type="button"
              disabled={locatedComplaints.length === 0}
              onClick={() => {
                if (mapRef.current) {
                  fitStaffLocations(mapRef.current, positions);
                }
                setSelectedComplaintId(null);
              }}
              className="text-sm font-semibold text-primary-600 hover:underline disabled:opacity-50"
            >
              Fit visible locations
            </button>
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
                ref={mapRef}
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
                    ref={(marker) => {
                      if (marker) {
                        markerRefs.current.set(complaint.id, marker);
                      } else {
                        markerRefs.current.delete(complaint.id);
                      }
                    }}
                    eventHandlers={{
                      click: () => setSelectedComplaintId(complaint.id),
                    }}
                    center={[
                      complaint.latitude!,
                      complaint.longitude!,
                    ]}
                    radius={
                      selectedComplaintId === complaint.id ? 12 : 9
                    }
                    pathOptions={{
                      color: '#ffffff',
                      weight: 2,
                      fillColor:
                        selectedComplaintId === complaint.id
                          ? '#f59e0b'
                          : '#2563eb',
                      fillOpacity: 0.9,
                    }}
                  >
                    <Popup>
                      <div className="max-w-[240px] space-y-3">
                        <LiveComplaintSummary
                          complaint={toSummaryData(complaint)}
                          compact
                        />

                        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-ink-100 pt-2 dark:border-ink-800">
                          <LiveComplaintPriorityBadge
                            priority={complaint.priority}
                          />

                          <LiveComplaintDetailsLink
                            to={complaintDetailsPath(complaint.id)}
                            title={complaint.title}
                          />
                        </div>
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
                      <LiveComplaintCard
                        variant="compact"
                        complaint={toSummaryData(complaint)}
                        detailsTo={complaintDetailsPath(complaint.id)}
                        selected={selectedComplaintId === complaint.id}
                        locationUnavailable={!locatedIds.has(complaint.id)}
                        onSelectLocation={() => focusComplaint(complaint)}
                      />
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
