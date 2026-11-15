import { useEffect, useMemo, useState } from 'react';
import {
  CircleMarker,
  MapContainer as LeafletMapContainer,
  Popup,
  TileLayer,
  useMap,
} from 'react-leaflet';
import {
  MapPin,
  RefreshCw,
  RotateCcw,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useApp } from '@/context/AppContext';
import { AdminPublicMapReview } from '@/components/maps/AdminPublicMapReview';
import { PageHeader } from '@/components/ui/PageHeader';
import { cn } from '@/utils/format';
import {
  getPublicMapComplaints,
  type PublicMapComplaint,
} from '@/services/publicMapService';

type Position = [number, number];
type View = 'list' | 'split' | 'map';

const NEPAL_CENTER: Position = [28.3949, 84.1240];

const COLORS: Record<string, string> = {
  Submitted: '#3b82f6',
  UnderReview: '#a855f7',
  InProgress: '#f59e0b',
  Resolved: '#16a34a',
};

function readable(value: string): string {
  const spaced = value
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[_-]/g, ' ');

  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

function locationLabel(item: PublicMapComplaint): string {
  const ward = item.ward
    ? /^ward\b/i.test(item.ward)
      ? item.ward
      : `Ward ${item.ward}`
    : '';

  return [
    item.municipality || 'Municipality not specified',
    ward,
  ].filter(Boolean).join(' · ');
}

function hasCoordinates(item: PublicMapComplaint): boolean {
  return (
    item.latitude !== null &&
    item.longitude !== null &&
    Number.isFinite(item.latitude) &&
    Number.isFinite(item.longitude) &&
    item.latitude >= 26 &&
    item.latitude <= 31 &&
    item.longitude >= 80 &&
    item.longitude <= 89
  );
}

function MapViewport({
  positions,
  selected,
}: {
  positions: Position[];
  selected: Position | null;
}) {
  const map = useMap();

  useEffect(() => {
    if (selected) {
      map.flyTo(selected, 13, { duration: 0.6 });
    } else if (positions.length === 1) {
      map.setView(positions[0], 12);
    } else if (positions.length > 1) {
      map.fitBounds(positions, {
        padding: [40, 40],
        maxZoom: 13,
      });
    } else {
      map.setView(NEPAL_CENTER, 7);
    }
  }, [map, positions, selected]);

  return null;
}

export function PublicMapPage() {
  const { role, accessToken } = useApp();
  const [items, setItems] = useState<PublicMapComplaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reload, setReload] = useState(0);

  const [view, setView] = useState<View>('split');
  const [reviewOpen, setReviewOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [status, setStatus] = useState('');
  const [municipality, setMunicipality] = useState('');
  const [ward, setWard] = useState('');
  const [mappedOnly, setMappedOnly] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    let sequence = 0;
    let controller: AbortController | null = null;
    let loadedOnce = false;

    const load = (initial: boolean) => {
      const current = ++sequence;

      controller?.abort();
      const next = new AbortController();
      controller = next;

      if (initial) {
        setLoading(true);
        setError(null);
      }

      void getPublicMapComplaints(next.signal)
        .then((data) => {
          if (!active || current !== sequence) return;

          loadedOnce = true;
          setItems(data);
          setError(null);
        })
        .catch((err: unknown) => {
          if (
            !active ||
            current !== sequence ||
            next.signal.aborted
          ) return;

          if (!loadedOnce) {
            setError(
              err instanceof Error
                ? err.message
                : 'Unable to load public complaints.'
            );
          }
        })
        .finally(() => {
          if (active && current === sequence) {
            setLoading(false);
          }
        });
    };

    load(true);

    const refreshOnReturn = () => {
      if (document.visibilityState === 'visible') {
        load(false);
      }
    };

    const poll = window.setInterval(refreshOnReturn, 30000);
    window.addEventListener('focus', refreshOnReturn);

    document.addEventListener(
      'visibilitychange',
      refreshOnReturn
    );

    return () => {
      active = false;
      controller?.abort();
      window.clearInterval(poll);

      window.removeEventListener('focus', refreshOnReturn);

      document.removeEventListener(
        'visibilitychange',
        refreshOnReturn
      );
    };
  }, [reload]);

  const categories = useMemo(
    () => [...new Set(items.map((c) => c.category))]
      .filter(Boolean).sort(),
    [items]
  );

  const statuses = useMemo(
    () => [...new Set(items.map((c) => c.status))]
      .filter(Boolean).sort(),
    [items]
  );

  const municipalities = useMemo(
    () => [...new Set(items.map((c) => c.municipality))]
      .filter((value): value is string => Boolean(value))
      .sort(),
    [items]
  );

  const wards = useMemo(
    () => [...new Set(
      items
        .filter((c) => c.municipality === municipality)
        .map((c) => c.ward)
    )]
      .filter((value): value is string => Boolean(value))
      .sort(),
    [items, municipality]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();

    return items.filter((item) => {
      const matchesSearch =
        !q ||
        [
          item.category,
          item.status,
          item.municipality ?? '',
          item.ward ?? '',
        ].some((value) => value.toLowerCase().includes(q));

      return matchesSearch &&
        (!mappedOnly || hasCoordinates(item)) &&
        (!category || item.category === category) &&
        (!status || item.status === status) &&
        (!municipality || item.municipality === municipality) &&
        (!ward || item.ward === ward);
    });
  }, [
    items, search, category, status,
    municipality, ward, mappedOnly
  ]);

  const located = useMemo(
    () => filtered.filter(hasCoordinates),
    [filtered]
  );

  const positions = useMemo<Position[]>(
    () => located.map((item) => [
      item.latitude!,
      item.longitude!,
    ]),
    [located]
  );

  const selectedPosition = useMemo<Position | null>(() => {
    const found = located.find((item) => item.id === selectedId);

    return found
      ? [found.latitude!, found.longitude!]
      : null;
  }, [located, selectedId]);

  const missing = filtered.length - located.length;

  const reset = () => {
    setSearch('');
    setCategory('');
    setStatus('');
    setMunicipality('');
    setWard('');
    setMappedOnly(false);
    setSelectedId(null);
  };

  const selectComplaint = (item: PublicMapComplaint) => {
    setSelectedId(item.id);

    if (view === 'list' && hasCoordinates(item)) {
      setView('split');
    }
  };

  return (
    <div className="container-page py-8">
      <PageHeader
        title="Public Complaint Map"
        subtitle="Explore publicly available civic issue locations across Nepal."
        breadcrumbs={[{ label: 'Public Map' }]}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setReload((n) => n + 1)}
              className="rounded-xl border border-ink-200 bg-white px-3 py-2 text-xs font-medium text-ink-700 hover:border-primary-400 dark:border-ink-700 dark:bg-ink-900 dark:text-ink-200"
            >
              <span className="flex items-center gap-2">
                <RefreshCw className="h-4 w-4" />
                Refresh
              </span>
            </button>

            <div
              role="group"
              aria-label="Map view"
              className="flex rounded-xl border border-ink-200 p-1 dark:border-ink-700"
            >
              {(['list', 'split', 'map'] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setView(mode)}
                  aria-pressed={view === mode}
                  className={cn(
                    'rounded-lg px-3 py-1.5 text-xs font-medium capitalize transition',
                    view === mode
                      ? 'bg-primary-600 text-white'
                      : 'text-ink-600 hover:bg-ink-100 dark:text-ink-300'
                  )}
                >
                  {mode}
                </button>
              ))}
            </div>
          </div>
        }
      />

      <div className="mb-4 rounded-xl border border-primary-100 bg-primary-50/50 p-4 text-xs text-ink-600 dark:border-primary-900 dark:bg-primary-950/20 dark:text-ink-300">
        <strong>Privacy:</strong> The public map uses approximate
        coordinates. Citizen identities, private descriptions,
        exact addresses and internal records are not included.
      </div>

      {role === 'admin' && accessToken && (
        <div className="mb-4">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-ink-200 bg-white px-4 py-3 dark:border-ink-700 dark:bg-ink-900">
            <div>
              <h2 className="text-sm font-semibold text-ink-900 dark:text-ink-100">
                Public Map Approvals
              </h2>
              <p className="mt-0.5 text-xs text-ink-500">
                Review which complaints appear publicly.
              </p>
            </div>

            <button
              type="button"
              aria-expanded={reviewOpen}
              aria-controls="admin-map-review-panel"
              onClick={() => setReviewOpen((open) => !open)}
              className="rounded-lg border border-primary-200 bg-primary-50 px-4 py-2 text-xs font-semibold text-primary-700 transition hover:bg-primary-100 dark:border-primary-800 dark:bg-primary-950/30 dark:text-primary-300"
            >
              {reviewOpen
                ? 'Hide review queue'
                : 'Manage approvals'}
            </button>
          </div>

          {reviewOpen && (
            <div id="admin-map-review-panel" className="mt-3">
              <AdminPublicMapReview
                token={accessToken}
                onChanged={() => setReload((n) => n + 1)}
              />
            </div>
          )}
        </div>
      )}

      <div className="card mb-4 p-4">
        <h2 className="mb-3 text-sm font-semibold text-ink-900 dark:text-ink-100">
          Filter complaints
        </h2>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <label className="space-y-1 text-xs font-medium text-ink-600">
            <span>Category</span>
            <select
              className="input-base w-full"
              value={category}
              onChange={(e) => {
                setCategory(e.target.value);
                setSelectedId(null);
              }}
            >
              <option value="">All categories</option>
              {categories.map((value) => (
                <option key={value} value={value}>
                  {readable(value)}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-1 text-xs font-medium text-ink-600">
            <span>Status</span>
            <select
              className="input-base w-full"
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setSelectedId(null);
              }}
            >
              <option value="">All statuses</option>
              {statuses.map((value) => (
                <option key={value} value={value}>
                  {readable(value)}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-1 text-xs font-medium text-ink-600">
            <span>Municipality</span>
            <select
              className="input-base w-full"
              value={municipality}
              onChange={(e) => {
                setMunicipality(e.target.value);
                setWard('');
                setSelectedId(null);
              }}
            >
              <option value="">All municipalities</option>
              {municipalities.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-1 text-xs font-medium text-ink-600">
            <span>Ward</span>
            <select
              className="input-base w-full"
              value={ward}
              disabled={!municipality}
              onChange={(e) => {
                setWard(e.target.value);
                setSelectedId(null);
              }}
            >
              <option value="">
                {municipality
                  ? 'All wards'
                  : 'Choose municipality first'}
              </option>
              {wards.map((value) => (
                <option key={value} value={value}>
                  {/^ward\b/i.test(value) ? value : `Ward ${value}`}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <input
            type="search"
            aria-label="Search public complaints"
            placeholder="Search category, status or municipality..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setSelectedId(null);
            }}
            className="input-base max-w-sm"
          />

          <label className="flex cursor-pointer items-center gap-2 text-xs font-medium text-ink-700 dark:text-ink-200">
            <input
              type="checkbox"
              checked={mappedOnly}
              onChange={(event) => {
                setMappedOnly(event.target.checked);
                setSelectedId(null);
              }}
              className="h-4 w-4 accent-blue-600"
            />
            Show mapped complaints only
          </label>

          <button
            type="button"
            onClick={reset}
            className="flex items-center gap-1.5 text-xs font-medium text-primary-600 hover:underline"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Reset filters
          </button>
        </div>
      </div>

      {loading ? (
        <div role="status" className="card p-10 text-center text-sm text-ink-500">
          Loading complaint locations...
        </div>
      ) : error ? (
        <div role="alert" className="card p-8 text-center">
          <p className="text-sm text-error-600">{error}</p>
          <button
            type="button"
            onClick={() => setReload((n) => n + 1)}
            className="mt-3 rounded-lg bg-primary-600 px-4 py-2 text-sm text-white"
          >
            Try again
          </button>
        </div>
      ) : (
        <>
          <div className="mb-4 flex flex-wrap gap-4 text-xs text-ink-500">
            <span>{filtered.length} matching complaints</span>
            <span>{located.length} mapped locations</span>
            {missing > 0 && (
              <span className="text-amber-700">
                {missing} without valid coordinates
              </span>
            )}
          </div>

          <div className={cn(
            'grid min-w-0 gap-4',
            view === 'split' &&
              'lg:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)]'
          )}>
            {view !== 'map' && (
              <section
                aria-label="Complaint list"
                className="min-w-0"
              >
                <div className={cn(
                  'grid gap-3',
                  view === 'list'
                    ? 'sm:grid-cols-2 xl:grid-cols-3'
                    : 'max-h-[620px] overflow-y-auto pr-1'
                )}>
                  {filtered.map((item) => {
                    const hasPin = hasCoordinates(item);
                    const active = selectedId === item.id;

                    return (
                      <div key={item.id} className="space-y-1">
                        <button
                          type="button"
                          aria-pressed={active}
                        onClick={() => selectComplaint(item)}
                        className={cn(
                          'group w-full rounded-2xl border bg-white p-4 text-left shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-primary-400 hover:shadow-lg motion-reduce:transform-none dark:bg-ink-900',
                          active
                            ? 'border-primary-500 ring-2 ring-primary-500/20'
                            : 'border-ink-200 dark:border-ink-700'
                        )}
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="rounded-full bg-primary-50 px-2.5 py-1 text-xs font-semibold text-primary-700">
                            {readable(item.category)}
                          </span>

                          <span
                            className="rounded-full px-2.5 py-1 text-xs font-medium text-white"
                            style={{
                              backgroundColor:
                                COLORS[item.status] ?? '#64748b',
                            }}
                          >
                            {readable(item.status)}
                          </span>
                        </div>

                        <p className="mt-3 text-sm font-semibold text-ink-900 group-hover:text-primary-600 dark:text-ink-100">
                          {locationLabel(item)}
                        </p>

                        <p className="mt-2 text-xs text-ink-500">
                          Reported{' '}
                          {new Date(item.reportedAtUtc)
                            .toLocaleDateString('en-GB', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                            })}
                        </p>

                        <p className={cn(
                          'mt-3 flex items-center gap-1.5 text-xs',
                          hasPin
                            ? 'text-primary-600'
                            : 'text-amber-700'
                        )}>
                          <MapPin className="h-3.5 w-3.5" />
                          {hasPin
                            ? 'Focus on approximate location'
                            : 'Location not pinned'}
                        </p>
                        </button>

                        {role === 'admin' && (
                          <Link
                            to={`/admin/complaints/${encodeURIComponent(item.id)}`}
                            className="inline-flex items-center rounded-lg px-3 py-1.5 text-xs font-semibold text-primary-600 transition hover:bg-primary-50 hover:underline dark:hover:bg-primary-950/30"
                          >
                            Open full complaint details
                          </Link>
                        )}
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {view !== 'list' && (
              <section
                aria-label="Public map"
                className="min-w-0 overflow-hidden rounded-2xl border border-ink-200"
              >
                <LeafletMapContainer
                  center={NEPAL_CENTER}
                  zoom={7}
                  scrollWheelZoom
                  className="h-[620px] w-full"
                >
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />

                  <MapViewport
                    positions={positions}
                    selected={selectedPosition}
                  />

                  {located.map((item) => (
                    <CircleMarker
                      key={item.id}
                      center={[
                        item.latitude!,
                        item.longitude!,
                      ]}
                      radius={selectedId === item.id ? 12 : 8}
                      pathOptions={{
                        color: '#ffffff',
                        weight: 2,
                        fillColor:
                          COLORS[item.status] ?? '#64748b',
                        fillOpacity: 0.9,
                      }}
                      eventHandlers={{
                        click: () => setSelectedId(item.id),
                      }}
                    >
                      <Popup>
                        <div className="space-y-1 text-sm">
                          <strong>{readable(item.category)}</strong>
                          <p>{locationLabel(item)}</p>
                          <p>Status: {readable(item.status)}</p>
                          <p className="text-xs">
                            Approximate public location
                          </p>

                          {role === 'admin' && (
                            <Link
                              to={`/admin/complaints/${encodeURIComponent(item.id)}`}
                              className="inline-block font-semibold text-blue-700 underline"
                            >
                              Open full complaint details
                            </Link>
                          )}
                        </div>
                      </Popup>
                    </CircleMarker>
                  ))}
                </LeafletMapContainer>
              </section>
            )}
          </div>

          <p className="mt-4 text-xs text-ink-500">
            Showing up to 1,000 recent eligible complaints.
            Coordinates are approximate. Complaints without
            valid map positions remain in the list.
          </p>
        </>
      )}
    </div>
  );
}
