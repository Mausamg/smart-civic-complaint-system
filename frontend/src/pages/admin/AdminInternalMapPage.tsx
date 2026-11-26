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
import { PageHeader } from '@/components/ui/PageHeader';
import { useApp } from '@/context/AppContext';
import {
  getAdminInternalMapComplaints,
  type AdminInternalMapComplaint,
} from '@/services/adminInternalMapService';

type Position = [number, number];

type Filters = {
  status: string;
  category: string;
  priority: string;
  department: string;
  municipality: string;
  assignment: string;
};

type FilterOption = {
  value: string;
  label: string;
};

type LoadResult =
  | {
      attempt: number;
      complaints: AdminInternalMapComplaint[];
      error: null;
    }
  | {
      attempt: number;
      complaints: AdminInternalMapComplaint[];
      error: string;
    };

const EMPTY_COMPLAINTS: AdminInternalMapComplaint[] = [];

const EMPTY_FILTERS: Filters = {
  status: '',
  category: '',
  priority: '',
  department: '',
  municipality: '',
  assignment: '',
};

const STATUSES = [
  'Submitted',
  'UnderReview',
  'InProgress',
  'Resolved',
  'Rejected',
  'Withdrawn',
];

const PRIORITIES = [
  'Low',
  'Medium',
  'High',
  'Critical',
];

const NO_DEPARTMENT = '__no_department__';
const NO_MUNICIPALITY = '__no_municipality__';

const NEPAL_CENTER: Position = [28.3949, 84.124];

function readableValue(value: string): string {
  return value
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function hasValidCoordinates(
  complaint: AdminInternalMapComplaint
): boolean {
  return (
    Number.isFinite(complaint.latitude) &&
    Number.isFinite(complaint.longitude) &&
    Math.abs(complaint.latitude) <= 90 &&
    Math.abs(complaint.longitude) <= 180 &&
    (complaint.latitude !== 0 || complaint.longitude !== 0)
  );
}

function departmentKey(
  complaint: AdminInternalMapComplaint
): string {
  return complaint.departmentId
    ? `department:${complaint.departmentId}`
    : NO_DEPARTMENT;
}

function municipalityKey(
  complaint: AdminInternalMapComplaint
): string {
  const municipality = complaint.municipality?.trim();

  return municipality
    ? `municipality:${municipality}`
    : NO_MUNICIPALITY;
}

function departmentLabel(
  complaint: AdminInternalMapComplaint
): string {
  if (!complaint.departmentId) {
    return 'No department';
  }

  return complaint.departmentName?.trim()
    || 'Department name unavailable';
}

function complaintDetailsPath(id: string): string {
  return `/admin/complaints/${encodeURIComponent(id)}`;
}

function markerColor(priority: string): string {
  switch (priority) {
    case 'Critical':
      return '#dc2626';
    case 'High':
      return '#ea580c';
    case 'Low':
      return '#16a34a';
    default:
      return '#2563eb';
  }
}

function fitVisibleLocations(
  map: LeafletMap,
  positions: Position[]
) {
  map.stop();

  if (positions.length === 1) {
    map.setView(positions[0], 14);
  } else if (positions.length > 1) {
    map.fitBounds(positions, {
      padding: [36, 36],
      maxZoom: 14,
    });
  }
}

function FitMarkers({
  positions,
}: {
  positions: Position[];
}) {
  const map = useMap();

  useEffect(() => {
    fitVisibleLocations(map, positions);
  }, [map, positions]);

  return null;
}

function FilterSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: FilterOption[];
  onChange: (value: string) => void;
}) {
  const missingSelection =
    value !== '' &&
    !options.some((option) => option.value === value);

  return (
    <label className="block min-w-0 space-y-1">
      <span className="text-sm font-medium text-ink-700">
        {label}
      </span>

      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-lg border border-ink-200 bg-white px-3 py-2 text-sm text-ink-900"
      >
        <option value="">All</option>

        {missingSelection && (
          <option value={value}>
            Previously selected (no matching records)
          </option>
        )}

        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function toSummaryData(
  complaint: AdminInternalMapComplaint
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
    departmentLabel: departmentLabel(complaint),
    municipalityLabel: complaint.ward
      ? `${municipality} · Ward ${complaint.ward}`
      : municipality,
    assignmentLabel: complaint.isAssigned
      ? 'Assigned'
      : 'Unassigned',
  };
}

function InternalMapContent({ token }: { token: string }) {
  const [attempt, setAttempt] = useState(0);

  const [result, setResult] =
    useState<LoadResult | null>(null);

  const [filters, setFilters] =
    useState<Filters>({ ...EMPTY_FILTERS });

  const [selectedId, setSelectedId] =
    useState<string | null>(null);

  const mapRef = useRef<LeafletMap | null>(null);

  const markerRefs = useRef(
    new Map<string, LeafletCircleMarker>()
  );

  useEffect(() => {
    const controller = new AbortController();

    void getAdminInternalMapComplaints(
      token,
      controller.signal
    )
      .then((data) => {
        if (controller.signal.aborted) return;

        if (!Array.isArray(data)) {
          throw new Error('Unexpected complaint map response.');
        }

        setResult({
          attempt,
          complaints: data.filter(hasValidCoordinates),
          error: null,
        });
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;

        setResult({
          attempt,
          complaints: [],
          error:
            error instanceof Error
              ? error.message
              : 'Unable to load internal complaint locations.',
        });
      });

    return () => controller.abort();
  }, [token, attempt]);

  const currentResult =
    result?.attempt === attempt ? result : null;

  const loading = currentResult === null;
  const error = currentResult?.error ?? null;

  const complaints =
    currentResult?.complaints ?? EMPTY_COMPLAINTS;

  const categoryOptions = useMemo<FilterOption[]>(
    () =>
      [...new Set(complaints.map((c) => c.category))]
        .sort()
        .map((category) => ({
          value: category,
          label: readableValue(category),
        })),
    [complaints]
  );

  const departmentOptions = useMemo<FilterOption[]>(() => {
    const departments = new Map<string, string>();

    for (const complaint of complaints) {
      departments.set(
        departmentKey(complaint),
        departmentLabel(complaint)
      );
    }

    return [...departments.entries()]
      .map(([value, label]) => ({ value, label }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [complaints]);

  const municipalityOptions = useMemo<FilterOption[]>(() => {
    const municipalities = new Map<string, string>();

    for (const complaint of complaints) {
      municipalities.set(
        municipalityKey(complaint),
        complaint.municipality?.trim() || 'Not specified'
      );
    }

    return [...municipalities.entries()]
      .map(([value, label]) => ({ value, label }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [complaints]);

  const filteredComplaints = useMemo(
    () =>
      complaints.filter(
        (complaint) =>
          (!filters.status ||
            complaint.status === filters.status) &&
          (!filters.category ||
            complaint.category === filters.category) &&
          (!filters.priority ||
            complaint.priority === filters.priority) &&
          (!filters.department ||
            departmentKey(complaint) === filters.department) &&
          (!filters.municipality ||
            municipalityKey(complaint) === filters.municipality) &&
          (!filters.assignment ||
            (filters.assignment === 'assigned'
              ? complaint.isAssigned
              : !complaint.isAssigned))
      ),
    [complaints, filters]
  );

  const positions = useMemo<Position[]>(
    () =>
      filteredComplaints.map((complaint) => [
        complaint.latitude,
        complaint.longitude,
      ]),
    [filteredComplaints]
  );

  function clearSelection() {
    setSelectedId(null);
    mapRef.current?.stop();
    mapRef.current?.closePopup();
  }

  function updateFilter(key: keyof Filters, value: string) {
    clearSelection();

    setFilters((previous) => ({
      ...previous,
      [key]: value,
    }));
  }

  function resetFilters() {
    clearSelection();
    setFilters({ ...EMPTY_FILTERS });
  }

  function refreshComplaints() {
    clearSelection();
    setAttempt((previous) => previous + 1);
  }

  function focusComplaint(complaint: AdminInternalMapComplaint) {
    setSelectedId(complaint.id);

    const map = mapRef.current;
    const marker = markerRefs.current.get(complaint.id);

    if (map) {
      map.stop();

      map.flyTo(
        [complaint.latitude, complaint.longitude],
        Math.max(15, map.getZoom()),
        { duration: 0.5 }
      );
    }

    marker?.bringToFront();
    marker?.openPopup();
  }

  function fitAllVisible() {
    clearSelection();

    if (mapRef.current) {
      fitVisibleLocations(mapRef.current, positions);
    }
  }

  if (loading) {
    return (
      <div
        role="status"
        className="rounded-2xl border border-ink-200 bg-white p-10 text-center text-sm text-ink-600"
      >
        Loading internal complaint locations...
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6">
        <p role="alert" className="font-medium text-red-800">
          Unable to load the internal complaint map.
        </p>

        <p className="mt-2 text-sm text-red-700">
          {error}
        </p>

        <button
          type="button"
          onClick={refreshComplaints}
          className="mt-4 rounded-lg border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-800"
        >
          Try again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <section
        aria-label="Complaint map filters"
        className="rounded-2xl border border-ink-200 bg-white p-4"
      >
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-semibold text-ink-900">
            Filter complaints
          </h2>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={resetFilters}
              className="rounded-lg border border-ink-200 px-3 py-2 text-sm font-medium text-ink-700 hover:bg-ink-50"
            >
              Reset filters
            </button>

            <button
              type="button"
              onClick={refreshComplaints}
              className="rounded-lg border border-ink-200 px-3 py-2 text-sm font-medium text-ink-700 hover:bg-ink-50"
            >
              Refresh
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <FilterSelect
            label="Status"
            value={filters.status}
            options={STATUSES.map((status) => ({
              value: status,
              label: readableValue(status),
            }))}
            onChange={(value) => updateFilter('status', value)}
          />

          <FilterSelect
            label="Category"
            value={filters.category}
            options={categoryOptions}
            onChange={(value) => updateFilter('category', value)}
          />

          <FilterSelect
            label="Priority"
            value={filters.priority}
            options={PRIORITIES.map((priority) => ({
              value: priority,
              label: priority,
            }))}
            onChange={(value) => updateFilter('priority', value)}
          />

          <FilterSelect
            label="Department"
            value={filters.department}
            options={departmentOptions}
            onChange={(value) => updateFilter('department', value)}
          />

          <FilterSelect
            label="Municipality"
            value={filters.municipality}
            options={municipalityOptions}
            onChange={(value) => updateFilter('municipality', value)}
          />

          <FilterSelect
            label="Staff assignment"
            value={filters.assignment}
            options={[
              { value: 'assigned', label: 'Assigned' },
              { value: 'unassigned', label: 'Unassigned' },
            ]}
            onChange={(value) => updateFilter('assignment', value)}
          />
        </div>

        <p
          aria-live="polite"
          className="mt-4 text-sm text-ink-600"
        >
          Showing {filteredComplaints.length} of {complaints.length}{' '}
          complaints with valid locations.
        </p>
      </section>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <section
          aria-label="Internal complaint locations"
          className="min-w-0 rounded-2xl border border-ink-200 bg-white p-4"
        >
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-semibold text-ink-900">
                Complaint locations
              </h2>

              <p className="mt-1 text-xs text-ink-500">
                Exact incident locations for internal operations.
              </p>
            </div>

            <button
              type="button"
              onClick={fitAllVisible}
              disabled={positions.length === 0}
              className="rounded-lg border border-ink-200 px-3 py-2 text-sm font-medium text-ink-700 hover:bg-ink-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Fit visible locations
            </button>
          </div>

          <div className="mb-3 flex flex-wrap gap-x-4 gap-y-2 text-xs text-ink-600">
            {PRIORITIES.map((priority) => (
              <span
                key={priority}
                className="inline-flex items-center gap-1.5"
              >
                <span
                  aria-hidden="true"
                  className="h-3 w-3 rounded-full"
                  style={{ backgroundColor: markerColor(priority) }}
                />
                {priority}
              </span>
            ))}

            <span className="inline-flex items-center gap-1.5">
              <span
                aria-hidden="true"
                className="h-3 w-3 rounded-full border border-amber-800 bg-amber-400"
              />
              Selected
            </span>
          </div>

          {positions.length === 0 ? (
            <div className="rounded-xl border border-ink-200 p-10 text-center">
              <p className="font-medium text-ink-700">
                {complaints.length === 0
                  ? 'No complaint locations available.'
                  : 'No complaints match these filters.'}
              </p>

              <p className="mt-2 text-sm text-ink-500">
                {complaints.length === 0
                  ? 'Complaints need valid GPS coordinates to appear here.'
                  : 'Adjust or reset the filters to view more locations.'}
              </p>
            </div>
          ) : (
            <div className="isolate overflow-hidden rounded-xl border border-ink-200">
              <LeafletMapContainer
                ref={mapRef}
                center={NEPAL_CENTER}
                zoom={7}
                scrollWheelZoom
                className="h-[400px] w-full sm:h-[560px]"
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                <FitMarkers positions={positions} />

                {filteredComplaints.map((complaint) => {
                  const selected = selectedId === complaint.id;

                  return (
                    <CircleMarker
                      key={complaint.id}
                      ref={(marker) => {
                        if (marker) {
                          markerRefs.current.set(complaint.id, marker);
                        } else {
                          markerRefs.current.delete(complaint.id);
                        }
                      }}
                      center={[
                        complaint.latitude,
                        complaint.longitude,
                      ]}
                      radius={selected ? 12 : 9}
                      eventHandlers={{
                        click: () => {
                          setSelectedId(complaint.id);
                          markerRefs.current
                            .get(complaint.id)
                            ?.bringToFront();
                        },
                      }}
                      pathOptions={{
                        color: selected ? '#92400e' : '#ffffff',
                        weight: selected ? 3 : 2,
                        fillColor: selected
                          ? '#f59e0b'
                          : markerColor(complaint.priority),
                        fillOpacity: 0.9,
                      }}
                    >
                      <Popup autoPan={false}>
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
                  );
                })}
              </LeafletMapContainer>
            </div>
          )}
        </section>

        <section
          aria-label="Matching complaints"
          className="min-w-0 rounded-2xl border border-ink-200 bg-white p-4"
        >
          <div className="mb-4 flex items-center justify-between gap-2">
            <h2 className="font-semibold text-ink-900">
              Matching complaints
            </h2>

            <span className="rounded-full bg-ink-100 px-2.5 py-1 text-xs font-medium text-ink-700">
              {filteredComplaints.length}
            </span>
          </div>

          {filteredComplaints.length === 0 ? (
            <p className="py-6 text-center text-sm text-ink-500">
              No complaints to display.
            </p>
          ) : (
            <div className="max-h-[620px] space-y-3 overflow-y-auto pr-1">
              {filteredComplaints.map((complaint) => {
                const selected = selectedId === complaint.id;

                return (
                  <LiveComplaintCard
                    key={complaint.id}
                    variant="compact"
                    complaint={toSummaryData(complaint)}
                    detailsTo={complaintDetailsPath(complaint.id)}
                    selected={selected}
                    onSelectLocation={() => focusComplaint(complaint)}
                  />
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

export function AdminInternalMapPage() {
  const { accessToken } = useApp();

  return (
    <div>
      <PageHeader
        title="Internal Complaint Map"
        subtitle="Explore exact complaint locations across all departments and statuses."
        breadcrumbs={[
          { label: 'Dashboard', to: '/admin/dashboard' },
          { label: 'Internal Complaint Map' },
        ]}
      />

      <div className="mb-5 rounded-xl border border-blue-200 bg-blue-50 p-4">
        <p className="text-sm font-semibold text-blue-900">
          Administrator-only operational map
        </p>

        <p className="mt-1 text-sm text-blue-800">
          This internal view includes private and unapproved complaint
          locations. Viewing a complaint here does not publish it on
          the Public Map or change its consent settings.
        </p>
      </div>

      {accessToken ? (
        <InternalMapContent
          key={accessToken}
          token={accessToken}
        />
      ) : (
        <p
          role="alert"
          className="rounded-xl border border-ink-200 p-5 text-sm text-ink-700"
        >
          Please sign in as an administrator to access this map.
        </p>
      )}
    </div>
  );
}
