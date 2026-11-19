import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { RefreshCw, ShieldCheck } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import {
  getAdminPublicMapComplaints,
  setAdminPublicMapApproval,
  type AdminPublicMapComplaint,
} from '@/services/adminPublicMapService';

type Filter = 'ready' | 'no-consent' | 'approved' | 'all';

interface Props {
  token: string;
  onChanged: () => void;
}

export function AdminPublicMapReview({
  token,
  onChanged,
}: Props) {
  const { addToast } = useApp();

  const [rows, setRows] = useState<AdminPublicMapComplaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reload, setReload] = useState(0);

  const [filter, setFilter] = useState<Filter>('ready');
  const [search, setSearch] = useState('');
  const [limit, setLimit] = useState(4);

  const [reviewId, setReviewId] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [removeId, setRemoveId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<{
    id: string;
    message: string;
  } | null>(null);

  useEffect(() => {
    let active = true;
    const controller = new AbortController();

    setLoading(true);
    setError(null);

    void getAdminPublicMapComplaints(token, controller.signal)
      .then((data) => {
        if (active) setRows(data);
      })
      .catch((err: unknown) => {
        if (!active || controller.signal.aborted) return;

        setError(
          err instanceof Error
            ? err.message
            : 'Unable to load the review queue.'
        );
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, [token, reload]);

  const ready = rows.filter(
    (row) =>
      row.isPublicMapOptedIn &&
      !row.isPublicMapApproved &&
      row.status !== 'Rejected' &&
      row.status !== 'Withdrawn'
  ).length;

  const noConsent = rows.filter(
    (row) => !row.isPublicMapOptedIn
  ).length;

  const approved = rows.filter(
    (row) => row.isPublicMapApproved
  ).length;

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();

    return rows.filter((row) => {
      if (
        filter === 'ready' &&
        (!row.isPublicMapOptedIn ||
          row.isPublicMapApproved ||
          row.status === 'Rejected' ||
          row.status === 'Withdrawn')
      ) {
        return false;
      }

      if (filter === 'no-consent' && row.isPublicMapOptedIn) {
        return false;
      }

      if (filter === 'approved' && !row.isPublicMapApproved) {
        return false;
      }

      return !query || [
        row.title,
        row.category,
        row.status,
        row.municipality ?? '',
        row.ward ?? '',
      ].some((value) => value.toLowerCase().includes(query));
    });
  }, [rows, filter, search]);

  const updateApproval = async (
    row: AdminPublicMapComplaint,
    shouldApprove: boolean
  ) => {
    if (busyId) return;

    if (
      shouldApprove &&
      (!row.isPublicMapOptedIn ||
        row.status === 'Rejected' ||
        row.status === 'Withdrawn' ||
        reviewId !== row.id ||
        !confirmed)
    ) return;

    setBusyId(row.id);
    setActionError(null);

    try {
      await setAdminPublicMapApproval(
        token,
        row.id,
        shouldApprove,
        shouldApprove && confirmed
      );

      setRows((previous) => previous.map((item) =>
        item.id === row.id
          ? { ...item, isPublicMapApproved: shouldApprove }
          : item
      ));

      setReviewId(null);
      setConfirmed(false);
      setRemoveId(null);

      setReload((value) => value + 1);
      onChanged();

      addToast({
        type: 'success',
        title: shouldApprove
          ? 'Public map approval saved'
          : 'Public map approval removed',
        message: shouldApprove
          ? 'The complaint is eligible for public display.'
          : 'The complaint is no longer publicly visible.',
      });
    } catch (err: unknown) {
      setActionError({
        id: row.id,
        message: err instanceof Error
          ? err.message
          : 'Unable to update approval.',
      });
    } finally {
      setBusyId(null);
    }
  };

  return (
    <section
      aria-label="Admin Public Map Review"
      className="card mb-4 p-5"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-base font-semibold text-ink-900 dark:text-ink-100">
            <ShieldCheck className="h-5 w-5 text-primary-600" />
            Public Map Review
          </h2>

          <p className="mt-1 text-xs text-ink-500">
            Administrator-only complaint publication review.
          </p>
        </div>

        <button
          type="button"
          disabled={loading || busyId !== null}
          onClick={() => setReload((n) => n + 1)}
          className="flex items-center gap-2 rounded-lg border border-ink-200 px-3 py-2 text-xs font-medium disabled:opacity-50 dark:border-ink-700"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </button>
      </div>

      <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
        Before approving, inspect the complete complaint.
        Confirm that disclosing its approximate location and
        municipality/ward cannot identify a person, home,
        shelter or another sensitive site.
      </p>


      <div className="mt-4 flex flex-wrap gap-2">
        {([
          ['ready', `Ready for review (${ready})`],
          ['no-consent', `No consent (${noConsent})`],
          ['approved', `Approved (${approved})`],
          ['all', `All (${rows.length})`],
        ] as const).map(([value, label]) => (
          <button
            key={value}
            type="button"
            aria-pressed={filter === value}
            onClick={() => {
              setFilter(value);
              setLimit(4);
              setReviewId(null);
              setRemoveId(null);
              setConfirmed(false);
              setActionError(null);
            }}
            className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
              filter === value
                ? 'border-primary-600 bg-primary-600 text-white'
                : 'border-ink-200 text-ink-600 hover:border-primary-400 dark:border-ink-700 dark:text-ink-300'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <input
        type="search"
        value={search}
        aria-label="Search public map review queue"
        onChange={(event) => {
          setSearch(event.target.value);
          setLimit(4);
        }}
        placeholder="Search complaint title, category or municipality..."
        className="input-base mt-3 w-full"
      />

      {loading ? (
        <p role="status" className="mt-4 text-sm text-ink-500">
          Loading complaints...
        </p>
      ) : error ? (
        <div role="alert" className="mt-4 space-y-2">
          <p className="text-sm text-error-600">{error}</p>
          <button
            type="button"
            onClick={() => setReload((n) => n + 1)}
            className="text-xs font-semibold text-primary-600 hover:underline"
          >
            Try again
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <p className="mt-4 text-sm text-ink-500">
          No complaints match this review filter.
        </p>
      ) : (
        <>
          <div className="mt-4 grid gap-3 lg:grid-cols-2">
            {filtered.slice(0, limit).map((row) => {
              const eligible =
                row.status !== 'Rejected' &&
                row.status !== 'Withdrawn';

              const hasPin =
                row.latitude !== null &&
                row.longitude !== null &&
                Number.isFinite(row.latitude) &&
                Number.isFinite(row.longitude) &&
                row.latitude >= 26 &&
                row.latitude <= 31 &&
                row.longitude >= 80 &&
                row.longitude <= 89;

              return (
                <article
                  key={row.id}
                  className="rounded-xl border border-ink-200 p-4 transition-colors hover:border-primary-300 dark:border-ink-700"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs text-ink-500">
                      {row.category} · {row.status}
                    </span>

                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`rounded-full px-2 py-1 text-xs font-semibold ${
                        row.isPublicMapOptedIn
                          ? 'bg-success-50 text-success-700'
                          : 'bg-amber-50 text-amber-800'
                      }`}>
                        {row.isPublicMapOptedIn
                          ? 'Consent granted'
                          : 'No citizen consent'}
                      </span>

                      <span className={`rounded-full px-2 py-1 text-xs font-semibold ${
                        row.isPublicMapApproved
                          ? 'bg-success-50 text-success-700'
                          : 'bg-ink-100 text-ink-600 dark:bg-ink-800 dark:text-ink-300'
                      }`}>
                        {row.isPublicMapApproved
                          ? 'Approved'
                          : 'Not approved'}
                      </span>
                    </div>
                  </div>

                  <h3 className="mt-2 text-sm font-semibold text-ink-900 dark:text-ink-100">
                    {row.title}
                  </h3>

                  <p className="mt-2 text-xs text-ink-500">
                    {row.municipality || 'Municipality unavailable'}
                    {row.ward ? ` · Ward ${row.ward}` : ''}
                  </p>

                  <p className="mt-1 text-xs text-ink-500">
                    {hasPin
                      ? 'Map coordinates available'
                      : 'No valid coordinates — public list only'}
                  </p>

                  <Link
                    to={`/admin/complaints/${encodeURIComponent(row.id)}`}
                    className="mt-3 inline-block text-xs font-semibold text-primary-600 hover:underline"
                  >
                    Review full complaint details
                  </Link>

                  {!row.isPublicMapOptedIn &&
                    !row.isPublicMapApproved &&
                    eligible && (
                      <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
                        Awaiting citizen consent. This complaint cannot
                        be approved for public display until the citizen
                        opts in.
                      </p>
                    )}

                  {actionError?.id === row.id && (
                    <p
                      role="alert"
                      className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300"
                    >
                      {actionError.message}
                    </p>
                  )}

                  {!row.isPublicMapApproved &&
                    row.isPublicMapOptedIn &&
                    eligible && (
                    <div className="mt-3">
                      {reviewId !== row.id ? (
                        <button
                          type="button"
                          disabled={busyId !== null}
                          onClick={() => {
                            setReviewId(row.id);
                            setRemoveId(null);
                            setConfirmed(false);
                          }}
                          className="rounded-lg border border-primary-300 px-3 py-2 text-xs font-semibold text-primary-600 hover:bg-primary-50 disabled:opacity-50"
                        >
                          Review for approval
                        </button>
                      ) : (
                        <div className="space-y-3 rounded-lg border border-primary-200 p-3">
                          <label className="flex items-start gap-2 text-xs text-ink-700 dark:text-ink-200">
                            <input
                              type="checkbox"
                              checked={confirmed}
                              onChange={(event) =>
                                setConfirmed(event.target.checked)
                              }
                              className="mt-0.5 h-4 w-4"
                            />
                            <span>
                              I reviewed this complaint and confirmed
                              its public location is safe to disclose.
                            </span>
                          </label>

                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              disabled={!confirmed || busyId !== null}
                              onClick={() =>
                                void updateApproval(row, true)
                              }
                              className="rounded-lg bg-primary-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
                            >
                              {busyId === row.id
                                ? 'Approving...'
                                : 'Confirm approval'}
                            </button>

                            <button
                              type="button"
                              disabled={busyId !== null}
                              onClick={() => {
                                setReviewId(null);
                                setConfirmed(false);
                              }}
                              className="rounded-lg border border-ink-200 px-3 py-2 text-xs dark:border-ink-700"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {!row.isPublicMapApproved && !eligible && (
                    <p className="mt-3 text-xs text-error-600">
                      Rejected or withdrawn complaints cannot
                      be approved.
                    </p>
                  )}

                  {row.isPublicMapApproved && (
                    <div className="mt-3">
                      {removeId !== row.id ? (
                        <button
                          type="button"
                          disabled={busyId !== null}
                          onClick={() => {
                            setRemoveId(row.id);
                            setReviewId(null);
                            setConfirmed(false);
                          }}
                          className="rounded-lg border border-error-300 px-3 py-2 text-xs font-semibold text-error-600 hover:bg-error-50 disabled:opacity-50"
                        >
                          Remove from public map
                        </button>
                      ) : (
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-xs text-ink-600">
                            Confirm removal?
                          </span>

                          <button
                            type="button"
                            disabled={busyId !== null}
                            onClick={() =>
                              void updateApproval(row, false)
                            }
                            className="rounded-lg bg-error-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
                          >
                            {busyId === row.id
                              ? 'Removing...'
                              : 'Yes, remove'}
                          </button>

                          <button
                            type="button"
                            disabled={busyId !== null}
                            onClick={() => setRemoveId(null)}
                            className="rounded-lg border border-ink-200 px-3 py-2 text-xs dark:border-ink-700"
                          >
                            Cancel
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </article>
              );
            })}
          </div>

          {filtered.length > limit && (
            <button
              type="button"
              onClick={() => setLimit((n) => n + 4)}
              className="mt-4 rounded-lg border border-ink-200 px-4 py-2 text-xs font-semibold text-primary-600 hover:border-primary-400 dark:border-ink-700"
            >
              Show more ({filtered.length - limit} remaining)
            </button>
          )}
        </>
      )}

      <p className="mt-4 text-xs text-ink-500">
        The review queue includes up to 1,000 recent complaints.
        Approval does not change complaint status or assignment.
      </p>
    </section>
  );
}
