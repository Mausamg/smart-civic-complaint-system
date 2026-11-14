import { useEffect, useMemo, useState } from 'react';
import { ArrowUpRight, Calendar, Edit2, Megaphone, Pin, Plus, RefreshCw, Trash2 } from 'lucide-react';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Checkbox, Input, Select, Textarea } from '@/components/ui/Form';
import { Modal } from '@/components/ui/Modal';
import { PageHeader } from '@/components/ui/PageHeader';
import { SearchInput } from '@/components/ui/SearchInput';
import { useApp } from '@/context/AppContext';
import { districtsByProvince } from '@/data/nepalDistricts';
import {
  createAnnouncement,
  deleteAnnouncement,
  getManagedAnnouncements,
  ANNOUNCEMENTS_CHANGED_EVENT,
  ANNOUNCEMENTS_FEED_CHANGED_EVENT,
  ANNOUNCEMENTS_FEED_STORAGE_KEY,
  markAnnouncementAsRead,
  getPublishedAnnouncements,
  setAnnouncementPublished,
  updateAnnouncement,
  type AnnouncementApiResponse,
  type AnnouncementCategory,
  type AnnouncementSaveRequest,
} from '@/services/announcementService';
import { cn, formatDate } from '@/utils/format';

const categoryOptions: Array<{
  value: AnnouncementCategory;
  label: string;
}> = [
  { value: 'general', label: 'General' },
  { value: 'emergency', label: 'Emergency' },
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'policy', label: 'Policy' },
  { value: 'event', label: 'Event' },
];

const categoryColors: Record<AnnouncementCategory, string> = {
  general: 'border-primary-200 bg-primary-50 text-primary-700 dark:border-primary-900 dark:bg-primary-950/40 dark:text-primary-300',
  emergency: 'border-error-200 bg-error-50 text-error-700 dark:border-error-900 dark:bg-error-950/40 dark:text-error-300',
  maintenance: 'border-warning-200 bg-warning-50 text-warning-700 dark:border-warning-900 dark:bg-warning-950/40 dark:text-warning-300',
  policy: 'border-accent-200 bg-accent-50 text-accent-700 dark:border-accent-900 dark:bg-accent-950/40 dark:text-accent-300',
  event: 'border-purple-200 bg-purple-50 text-purple-700 dark:border-purple-900 dark:bg-purple-950/40 dark:text-purple-300',
};

interface AnnouncementDraft {
  title: string;
  body: string;
  category: AnnouncementCategory;
  locationScope: 'all' | 'local';
  country: string;
  province: string;
  district: string;
  municipality: string;
  ward: string;
  isFeatured: boolean;
  expiresOn: string;
}

const emptyDraft: AnnouncementDraft = {
  title: '',
  body: '',
  category: 'general',
  locationScope: 'all',
  country: 'Nepal',
  province: '',
  district: '',
  municipality: '',
  ward: '',
  isFeatured: false,
  expiresOn: '',
};

type StatusFilter = 'all' | 'published' | 'draft' | 'expired';

function locationLabel(item: AnnouncementApiResponse): string {
  if (item.locationScope === 'all') {
    return 'General notice';
  }

  return [
    item.municipality,
    item.ward,
    item.district,
    item.province,
  ].filter(Boolean).join(' · ');
}

function getStatus(item: AnnouncementApiResponse):
  'Published' | 'Draft' | 'Expired' {
  if (!item.isPublished) return 'Draft';

  if (
    item.expiresAtUtc &&
    new Date(item.expiresAtUtc).getTime() <= Date.now()
  ) return 'Expired';

  return 'Published';
}

function expiryDateForForm(iso: string | null): string {
  if (!iso) return '';

  const date = new Date(iso);

  if (Number.isNaN(date.getTime())) return '';

  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');

  return `${yyyy}-${mm}-${dd}`;
}

export function AnnouncementsPage() {
  const { role, accessToken, addToast } = useApp();
  const isAdmin = role === 'admin';

  const [items, setItems] = useState<AnnouncementApiResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reload, setReload] = useState(0);

  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [selected, setSelected] = useState<AnnouncementApiResponse | null>(null);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<AnnouncementApiResponse | null>(null);
  const [draft, setDraft] = useState<AnnouncementDraft>({ ...emptyDraft });
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [busyId, setBusyId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<AnnouncementApiResponse | null>(null);

  useEffect(() => {
    let active = true;
    let requestSequence = 0;
    let activeController: AbortController | null = null;
    let hasLoaded = false;

    const loadAnnouncements = (initial: boolean) => {
      const requestId = ++requestSequence;

      activeController?.abort();

      const controller = new AbortController();
      activeController = controller;

      if (initial) {
        setLoading(true);
        setLoadError(null);
        setItems([]);
      }

      const request = isAdmin
        ? accessToken
          ? getManagedAnnouncements(accessToken, controller.signal)
          : Promise.reject(
              new Error('Administrator login required.')
            )
        : getPublishedAnnouncements(controller.signal);

      void request
        .then((data) => {
          if (!active || requestId !== requestSequence) return;

          hasLoaded = true;
          setItems(data);
          setLoadError(null);
        })
        .catch((error: unknown) => {
          if (!active || requestId !== requestSequence) return;

          // Keep previously loaded notices visible if a
          // background refresh temporarily fails.
          if (!hasLoaded) {
            setLoadError(
              error instanceof Error
                ? error.message
                : 'Unable to load announcements.'
            );
          }
        })
        .finally(() => {
          if (active && requestId === requestSequence) {
            setLoading(false);
          }
        });
    };

    // Initial page load or manual refresh.
    loadAnnouncements(true);

    // Poll for new announcements without clearing
    // the currently displayed list.
    const pollId = window.setInterval(() => {
      if (document.visibilityState === 'visible') {
        loadAnnouncements(false);
      }
    }, 15000);

    // Refresh as soon as the citizen returns to this tab.
    const refreshOnReturn = () => {
      if (document.visibilityState === 'visible') {
        loadAnnouncements(false);
      }
    };

    document.addEventListener(
      'visibilitychange',
      refreshOnReturn
    );

    window.addEventListener('focus', refreshOnReturn);

    // Refresh immediately after changes in this tab.
    const onFeedChanged = () => {
      loadAnnouncements(false);
    };

    // Refresh immediately after an Admin update in
    // another tab of the same browser profile.
    const onCrossTabChange = (event: StorageEvent) => {
      if (event.key !== ANNOUNCEMENTS_FEED_STORAGE_KEY) {
        return;
      }

      loadAnnouncements(false);

      // Keep the unread sidebar badge synchronized too.
      window.dispatchEvent(
        new Event(ANNOUNCEMENTS_CHANGED_EVENT)
      );
    };

    window.addEventListener(
      ANNOUNCEMENTS_FEED_CHANGED_EVENT,
      onFeedChanged
    );

    window.addEventListener('storage', onCrossTabChange);

    return () => {
      active = false;
      activeController?.abort();
      window.clearInterval(pollId);

      window.removeEventListener(
        ANNOUNCEMENTS_FEED_CHANGED_EVENT,
        onFeedChanged
      );

      window.removeEventListener(
        'storage',
        onCrossTabChange
      );

      document.removeEventListener(
        'visibilitychange',
        refreshOnReturn
      );

      window.removeEventListener(
        'focus',
        refreshOnReturn
      );
    };
  }, [isAdmin, accessToken, reload]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();

    return items.filter((item) => {
      const matchesQuery =
        !needle ||
        item.title.toLowerCase().includes(needle) ||
        item.body.toLowerCase().includes(needle);

      const matchesCategory = !category || item.category === category;
      const currentStatus = getStatus(item);

      const matchesStatus =
        !isAdmin ||
        statusFilter === 'all' ||
        (statusFilter === 'published' && currentStatus === 'Published') ||
        (statusFilter === 'draft' && currentStatus === 'Draft') ||
        (statusFilter === 'expired' && currentStatus === 'Expired');

      return matchesQuery && matchesCategory && matchesStatus;
    });
  }, [items, query, category, statusFilter, isAdmin]);

  const featured = !isAdmin
    ? filtered.find((item) => item.isFeatured)
    : undefined;

  const refresh = () => setReload((n) => n + 1);

  const openAnnouncement = (
    item: AnnouncementApiResponse
  ) => {
    setSelected(item);

    if (isAdmin || !accessToken) return;

    void markAnnouncementAsRead(item.id, accessToken)
      .catch((error: unknown) => {
        addToast({
          type: 'error',
          title: 'Unable to mark announcement as read',
          message: error instanceof Error
            ? error.message
            : 'Please try again.',
        });
      });
  };

  const districtOptions = (
    districtsByProvince[draft.province] ?? []
  ).map((district) => ({
    value: district,
    label: district,
  }));

  const openCreate = () => {
    setEditing(null);
    setDraft({ ...emptyDraft });
    setFormError(null);
    setFormOpen(true);
  };

  const openEdit = (item: AnnouncementApiResponse) => {
    setEditing(item);
    setDraft({
      title: item.title,
      body: item.body,
      category: item.category,
      locationScope: item.locationScope,
      country: item.country ?? 'Nepal',
      province: item.province ?? '',
      district: (
        districtsByProvince[item.province ?? ''] ?? []
      ).includes(item.district ?? '')
        ? item.district ?? ''
        : '',
      municipality: item.municipality ?? '',
      ward: item.ward ?? '',
      isFeatured: item.isFeatured,
      expiresOn: expiryDateForForm(item.expiresAtUtc),
    });
    setFormError(null);
    setFormOpen(true);
  };

  const closeForm = () => {
    if (saving) return;
    setFormOpen(false);
    setEditing(null);
    setFormError(null);
  };

  const save = async (publishNow = false) => {
    if (saving || !accessToken || !isAdmin) return;

    const title = draft.title.trim();
    const body = draft.body.trim();
    const ward = draft.ward.trim();
    const country = draft.country.trim();
    const province = draft.province.trim();
    const district = draft.district.trim();
    const municipality = draft.municipality.trim();

    if (
      !title ||
      title.length > 160 ||
      !body ||
      body.length > 5000 ||
      ward.length > 100
    ) {
      setFormError(
        'Enter a title (up to 160 characters), body (up to 5000), and optional ward (up to 100).'
      );
      return;
    }

    if (draft.locationScope === 'local') {
      if (
        !country || !province || !district || !municipality ||
        !(districtsByProvince[province] ?? []).includes(district) ||
        country.length > 100 ||
        province.length > 100 ||
        district.length > 100 ||
        municipality.length > 120
      ) {
        setFormError(
          'Choose a valid district for the selected province and enter the required location details.'
        );
        return;
      }
    }

    let expiresAtUtc: string | null = null;

    if (draft.expiresOn) {
      const expiry = new Date(`${draft.expiresOn}T23:59:59`);

      if (
        Number.isNaN(expiry.getTime()) ||
        expiry.getTime() <= Date.now()
      ) {
        setFormError('Choose a future expiration date or leave it empty.');
        return;
      }

      expiresAtUtc = expiry.toISOString();
    }

    const request: AnnouncementSaveRequest = {
      title,
      body,
      category: draft.category,
      locationScope: draft.locationScope,
      country: draft.locationScope === 'local' ? country : null,
      province: draft.locationScope === 'local' ? province : null,
      district: draft.locationScope === 'local' ? district : null,
      municipality: draft.locationScope === 'local' ? municipality : null,
      ward: draft.locationScope === 'local' ? ward || null : null,
      isFeatured: draft.isFeatured,
      expiresAtUtc,
    };

    setSaving(true);
    setFormError(null);

    try {
      if (editing) {
        await updateAnnouncement(accessToken, editing.id, request);
      } else {
        const created = await createAnnouncement(
          accessToken,
          request
        );

        if (publishNow) {
          try {
            await setAnnouncementPublished(
              accessToken,
              created.id,
              true
            );
          } catch (publishError: unknown) {
            // Creation already succeeded. Never tell the user
            // the entire operation failed or retry creation.
            addToast({
              type: 'error',
              title: 'Draft saved, but publishing failed',
              message: publishError instanceof Error
                ? publishError.message
                : 'Open the saved draft and try publishing again.',
            });

            setFormOpen(false);
            setEditing(null);
            refresh();
            return;
          }
        }
      }

      addToast({
        type: 'success',
        title: editing
          ? 'Announcement updated'
          : publishNow
            ? 'Announcement published'
            : 'Draft created',
        message: editing
          ? 'Your changes were saved.'
          : publishNow
            ? 'The notice is now visible to citizens.'
            : 'Publish the draft when it is ready for citizens.',
      });

      setFormOpen(false);
      setEditing(null);
      refresh();
    } catch (error: unknown) {
      setFormError(
        error instanceof Error
          ? error.message
          : 'Unable to save announcement.'
      );
    } finally {
      setSaving(false);
    }
  };

  const changePublished = async (item: AnnouncementApiResponse) => {
    if (!isAdmin || !accessToken || busyId) return;

    setBusyId(item.id);

    try {
      await setAnnouncementPublished(
        accessToken,
        item.id,
        !item.isPublished
      );

      addToast({
        type: 'success',
        title: item.isPublished
          ? 'Announcement unpublished'
          : 'Announcement published',
      });

      refresh();
    } catch (error: unknown) {
      addToast({
        type: 'error',
        title: 'Unable to update publication status',
        message: error instanceof Error ? error.message : undefined,
      });
    } finally {
      setBusyId(null);
    }
  };

  const remove = async () => {
    if (!isAdmin || !accessToken || !deleting || busyId) return;

    setBusyId(deleting.id);

    try {
      await deleteAnnouncement(accessToken, deleting.id);

      addToast({
        type: 'success',
        title: 'Announcement deleted',
      });

      setDeleting(null);
      refresh();
    } catch (error: unknown) {
      addToast({
        type: 'error',
        title: 'Unable to delete announcement',
        message: error instanceof Error ? error.message : undefined,
      });
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div>
      <PageHeader
        title="Announcements"
        subtitle={
          isAdmin
            ? 'Create and manage official notices for citizens.'
            : 'Stay informed with the latest municipal notices.'
        }
        breadcrumbs={[
          {
            label: 'Dashboard',
            to: isAdmin ? '/admin/dashboard' : '/citizen/dashboard',
          },
          { label: 'Announcements' },
        ]}
        actions={
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={refresh}
              leftIcon={<RefreshCw className="h-4 w-4" />}
            >
              Refresh
            </Button>

            {isAdmin && (
              <Button
                type="button"
                size="sm"
                onClick={openCreate}
                leftIcon={<Plus className="h-4 w-4" />}
              >
                New announcement
              </Button>
            )}
          </div>
        }
      />

      {isAdmin && !loading && !loadError && (
        <div className="mb-5 grid gap-3 sm:grid-cols-3">
          {([
            ['Total notices', items.length],
            ['Published', items.filter(
              (item) => getStatus(item) === 'Published'
            ).length],
            ['Drafts', items.filter(
              (item) => getStatus(item) === 'Draft'
            ).length],
          ] as const).map(([label, count]) => (
            <Card key={label} className="p-4">
              <p className="text-xs text-ink-500">{label}</p>
              <p className="mt-1 text-2xl font-bold text-ink-900 dark:text-ink-100">
                {count}
              </p>
            </Card>
          ))}
        </div>
      )}

      <div className="mb-5 flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <SearchInput
            value={query}
            onChange={setQuery}
            placeholder="Search announcements..."
            className="min-w-[200px] flex-1"
          />

          {isAdmin && (
            <select
              aria-label="Filter publication status"
              value={statusFilter}
              onChange={(e) => setStatusFilter(
                e.target.value as StatusFilter
              )}
              className="input-base max-w-44"
            >
              <option value="all">All statuses</option>
              <option value="published">Published</option>
              <option value="draft">Drafts</option>
              <option value="expired">Expired</option>
            </select>
          )}
        </div>

        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => setCategory('')}
            className={cn(
              'rounded-full px-3 py-1.5 text-xs font-medium transition-all duration-200 hover:-translate-y-0.5 hover:shadow-sm motion-reduce:transform-none',
              !category
                ? 'bg-primary-600 text-white'
                : 'border border-ink-200 text-ink-600 dark:border-ink-700 dark:text-ink-300'
            )}
          >
            All categories
          </button>

          {categoryOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setCategory(option.value)}
              className={cn(
                'rounded-full px-3 py-1.5 text-xs font-medium transition-all duration-200 hover:-translate-y-0.5 hover:shadow-sm motion-reduce:transform-none',
                category === option.value
                  ? 'bg-primary-600 text-white'
                  : 'border border-ink-200 text-ink-600 dark:border-ink-700 dark:text-ink-300'
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {loading && (
        <p role="status" className="py-8 text-sm text-ink-500">
          Loading announcements...
        </p>
      )}

      {!loading && loadError && (
        <div role="alert" className="mb-5 rounded-xl border border-error-200 p-5">
          <p className="text-sm text-error-600">{loadError}</p>
          <Button
            variant="outline"
            size="sm"
            className="mt-3"
            onClick={refresh}
          >
            Retry
          </Button>
        </div>
      )}

      {!loading && !loadError && !isAdmin && featured && (
        <Card
          className="group relative mb-5 overflow-hidden p-0 transition-all duration-300 ease-out hover:-translate-y-1 hover:border-primary-300 hover:shadow-xl focus-within:border-primary-400 focus-within:shadow-xl motion-reduce:transform-none dark:hover:border-primary-700"
        >
          <button
            type="button"
            onClick={() => openAnnouncement(featured)}
            aria-label={`Read featured announcement: ${featured.title}`}
            className="absolute inset-0 z-10 cursor-pointer rounded-2xl focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary-500"
          >
            <span className="sr-only">
              Read featured announcement
            </span>
          </button>

          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary-500 via-accent-400 to-primary-500 opacity-0 transition-opacity duration-300 group-hover:opacity-100 group-focus-within:opacity-100"
          />

          <div className="flex flex-col lg:flex-row">
            <div className="flex-1 p-6">
              <div className="flex items-center gap-2">
                <Pin className="h-4 w-4 text-primary-600" />
                <span className="text-xs font-semibold uppercase text-primary-600">
                  Featured notice
                </span>
                <span className={cn(
                  'rounded-full border px-2 py-0.5 text-[10px] capitalize',
                  categoryColors[featured.category]
                )}>
                  {featured.category}
                </span>
              </div>

              <h2 className="mt-3 text-xl font-bold text-ink-900 transition-colors duration-300 group-hover:text-primary-600 dark:text-ink-100 dark:group-hover:text-primary-300">
                {featured.title}
              </h2>
              <p className="mt-2 line-clamp-4 whitespace-pre-wrap text-sm text-ink-600 dark:text-ink-300">
                {featured.body}
              </p>
              <p className="mt-4 text-xs text-ink-500">
                {featured.publishedAtUtc &&
                  formatDate(featured.publishedAtUtc)}
                {' · '}By {featured.author}
              </p>
              <p className="mt-2 text-xs text-ink-500">
                {locationLabel(featured)}
              </p>

              <div className="mt-4 flex items-center gap-1.5 text-xs font-semibold text-primary-600 dark:text-primary-300">
                Read announcement
                <ArrowUpRight
                  className="h-4 w-4 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 motion-reduce:transform-none"
                />
              </div>
            </div>

            <div className="flex h-28 items-center justify-center overflow-hidden bg-gradient-to-br from-primary-500 to-accent-500 transition-all duration-300 group-hover:brightness-110 lg:h-auto lg:w-44">
              <Megaphone
                className="h-11 w-11 text-white drop-shadow-md transition-transform duration-500 ease-out group-hover:-rotate-6 group-hover:scale-110 motion-reduce:transform-none"
              />
            </div>
          </div>
        </Card>
      )}

      {!loading && !loadError && filtered.length === 0 && (
        <EmptyState
          icon="Megaphone"
          title="No announcements found"
          description={
            items.length === 0
              ? isAdmin
                ? 'Create your first announcement to get started.'
                : 'No published announcements are available yet.'
              : 'Try adjusting your search or filters.'
          }
          action={
            isAdmin && items.length === 0
              ? <Button onClick={openCreate}>Create announcement</Button>
              : undefined
          }
        />
      )}

      {!loading && !loadError && filtered.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered
            .filter((item) => isAdmin || item.id !== featured?.id)
            .map((item) => (
              <Card
                key={item.id}
                className="group relative flex flex-col overflow-hidden p-5 transition-all duration-300 ease-out hover:-translate-y-1 hover:border-primary-300 hover:shadow-xl focus-within:border-primary-400 focus-within:shadow-lg motion-reduce:transform-none dark:hover:border-primary-700"
              >
                <div
                  aria-hidden="true"
                  className={cn(
                    'pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r opacity-0 transition-opacity duration-300 group-hover:opacity-100 group-focus-within:opacity-100',
                    item.category === 'emergency'
                      ? 'from-error-500 to-warning-400'
                      : 'from-primary-500 to-accent-500'
                  )}
                />

                {!isAdmin && (
                  <button
                    type="button"
                    onClick={() => openAnnouncement(item)}
                    aria-label={`Read announcement: ${item.title}`}
                    className="absolute inset-0 z-10 cursor-pointer rounded-2xl focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary-500"
                  >
                    <span className="sr-only">
                      Read announcement
                    </span>
                  </button>
                )}

                <div className="flex flex-wrap items-center gap-2">
                  <span className={cn(
                    'rounded-full border px-2.5 py-0.5 text-[10px] font-medium capitalize',
                    categoryColors[item.category]
                  )}>
                    {item.category}
                  </span>

                  {isAdmin && (
                    <span className={cn(
                      'rounded-full px-2.5 py-0.5 text-[10px] font-semibold',
                      getStatus(item) === 'Published'
                        ? 'bg-success-50 text-success-700'
                        : getStatus(item) === 'Expired'
                        ? 'bg-error-50 text-error-700'
                        : 'bg-ink-100 text-ink-600 dark:bg-ink-800 dark:text-ink-300'
                    )}>
                      {getStatus(item)}
                    </span>
                  )}

                  {item.isFeatured && (
                    <Pin className="h-3.5 w-3.5 text-primary-600" />
                  )}
                </div>

                {isAdmin ? (
                  <button
                    type="button"
                    onClick={() => openAnnouncement(item)}
                    className="mt-3 text-left text-sm font-semibold text-ink-900 transition-colors hover:text-primary-600 dark:text-ink-100"
                  >
                    {item.title}
                  </button>
                ) : (
                  <h3 className="mt-3 text-sm font-semibold text-ink-900 transition-colors duration-300 group-hover:text-primary-600 dark:text-ink-100 dark:group-hover:text-primary-300">
                    {item.title}
                  </h3>
                )}

                <p className="mt-2 line-clamp-3 flex-1 whitespace-pre-wrap text-xs text-ink-500">
                  {item.body}
                </p>

                <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-ink-100 pt-3 text-xs text-ink-500 dark:border-ink-800">
                  <Calendar className="h-3.5 w-3.5" />
                  <span>
                    {formatDate(
                      item.publishedAtUtc ?? item.createdAtUtc
                    )}
                  </span>
                  <span>· {locationLabel(item)}</span>
                </div>

                {!isAdmin && (
                  <div className="mt-3 flex items-center gap-1.5 text-xs font-semibold text-primary-600 dark:text-primary-300">
                    Read notice
                    <ArrowUpRight
                      className="h-4 w-4 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 motion-reduce:transform-none"
                    />
                  </div>
                )}

                {isAdmin && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button
                      size="xs"
                      variant="outline"
                      onClick={() => openEdit(item)}
                      leftIcon={<Edit2 className="h-3.5 w-3.5" />}
                    >
                      Edit
                    </Button>

                    <Button
                      size="xs"
                      variant={item.isPublished ? 'outline' : 'primary'}
                      disabled={busyId !== null}
                      loading={busyId === item.id}
                      onClick={() => void changePublished(item)}
                    >
                      {item.isPublished ? 'Unpublish' : 'Publish'}
                    </Button>

                    <Button
                      size="xs"
                      variant="danger"
                      disabled={busyId !== null}
                      onClick={() => setDeleting(item)}
                      leftIcon={<Trash2 className="h-3.5 w-3.5" />}
                    >
                      Delete
                    </Button>
                  </div>
                )}
              </Card>
            ))}
        </div>
      )}

      <Modal
        open={selected !== null}
        onClose={() => setSelected(null)}
        title={selected?.title}
        size="lg"
      >
        {selected && (
          <div>
            <div className="flex flex-wrap gap-2">
              <span className={cn(
                'rounded-full border px-2.5 py-0.5 text-xs capitalize',
                categoryColors[selected.category]
              )}>
                {selected.category}
              </span>
              <span className="rounded-full bg-ink-100 px-2.5 py-0.5 text-xs text-ink-700 dark:bg-ink-800 dark:text-ink-200">
                {locationLabel(selected)}
              </span>
            </div>

            <p className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-ink-700 dark:text-ink-200">
              {selected.body}
            </p>

            <div className="mt-5 border-t border-ink-100 pt-4 text-xs text-ink-500 dark:border-ink-800">
              <p>By {selected.author}</p>
              <p>
                {selected.isPublished ? 'Published' : 'Created'}:{' '}
                {formatDate(
                  selected.publishedAtUtc ?? selected.createdAtUtc
                )}
              </p>
              {selected.expiresAtUtc && (
                <p>Expires: {formatDate(selected.expiresAtUtc)}</p>
              )}
            </div>
          </div>
        )}
      </Modal>

      {isAdmin && (
        <>
          <Modal
            open={formOpen}
            onClose={closeForm}
            title={editing ? 'Edit announcement' : 'New announcement'}
            description="Save for later review or publish immediately."
            size="lg"
            footer={
              <>
                <Button
                  variant="outline"
                  disabled={saving}
                  onClick={closeForm}
                >
                  Cancel
                </Button>
                {!editing && (
                  <Button
                    variant="outline"
                    disabled={saving}
                    onClick={() => void save(false)}
                  >
                    Save draft
                  </Button>
                )}

                <Button
                  loading={saving}
                  onClick={() => void save(!editing)}
                >
                  {editing ? 'Save changes' : 'Publish now'}
                </Button>
              </>
            }
          >
            <div className="space-y-4">
              <Input
                label="Title"
                maxLength={160}
                value={draft.title}
                onChange={(e) => setDraft((old) => ({
                  ...old, title: e.target.value
                }))}
                placeholder="e.g. Scheduled water maintenance"
              />

              <Textarea
                label="Announcement details"
                maxLength={5000}
                rows={6}
                value={draft.body}
                onChange={(e) => setDraft((old) => ({
                  ...old, body: e.target.value
                }))}
                placeholder="Write the notice citizens will read..."
              />

              <div className="grid gap-4 sm:grid-cols-2">
                <Select
                  label="Category"
                  value={draft.category}
                  options={categoryOptions}
                  onChange={(e) => setDraft((old) => ({
                    ...old,
                    category: e.target.value as AnnouncementCategory,
                  }))}
                />

                <Select
                  label="Announcement coverage"
                  value={draft.locationScope}
                  options={[
                    { value: 'all', label: 'General announcement' },
                    { value: 'local', label: 'Location-specific announcement' },
                  ]}
                  onChange={(e) => setDraft((old) => ({
                    ...old,
                    locationScope: e.target.value as 'all' | 'local',
                  }))}
                />

                {draft.locationScope === 'local' && (
                  <>
                    <Select
                      label="Province"
                      value={draft.province}
                      placeholder="Choose province"
                      options={[
                        { value: 'Koshi', label: 'Koshi' },
                        { value: 'Madhesh', label: 'Madhesh' },
                        { value: 'Bagmati', label: 'Bagmati' },
                        { value: 'Gandaki', label: 'Gandaki' },
                        { value: 'Lumbini', label: 'Lumbini' },
                        { value: 'Karnali', label: 'Karnali' },
                        { value: 'Sudurpashchim', label: 'Sudurpashchim' },
                      ]}
                      onChange={(e) => setDraft((old) => ({
                        ...old,
                        province: e.target.value,
                        district: '',
                        municipality: '',
                        ward: '',
                      }))}
                    />

                    <Select
                      label="District"
                      required
                      disabled={!draft.province}
                      value={draft.district}
                      placeholder={
                        draft.province
                          ? 'Choose district'
                          : 'Choose province first'
                      }
                      options={districtOptions}
                      onChange={(e) => setDraft((old) => ({
                        ...old,
                        district: e.target.value,
                        municipality: '',
                        ward: '',
                      }))}
                      hint="Only districts in the selected province are shown."
                    />

                    <Input
                      label="Municipality"
                      required
                      maxLength={120}
                      value={draft.municipality}
                      onChange={(e) => setDraft((old) => ({
                        ...old, municipality: e.target.value
                      }))}
                      placeholder="e.g. Kathmandu Metropolitan City"
                    />

                    <Input
                      label="Ward (optional)"
                      maxLength={100}
                      value={draft.ward}
                      onChange={(e) => setDraft((old) => ({
                        ...old, ward: e.target.value
                      }))}
                      placeholder="e.g. Ward 7"
                    />
                  </>
                )}

                <Input
                  type="date"
                  label="Expiration date (optional)"
                  value={draft.expiresOn}
                  onChange={(e) => setDraft((old) => ({
                    ...old, expiresOn: e.target.value
                  }))}
                  hint="Expires at the end of the selected date in your local time."
                />
              </div>

              <Checkbox
                label="Feature this announcement at the top of the citizen feed"
                checked={draft.isFeatured}
                onChange={(value) => setDraft((old) => ({
                  ...old, isFeatured: value
                }))}
              />

              {formError && (
                <p role="alert" className="text-sm text-error-600">
                  {formError}
                </p>
              )}
            </div>
          </Modal>

          <Modal
            open={deleting !== null}
            onClose={() => {
              if (!busyId) setDeleting(null);
            }}
            title="Delete announcement?"
            size="sm"
            footer={
              <>
                <Button
                  variant="outline"
                  disabled={busyId !== null}
                  onClick={() => setDeleting(null)}
                >
                  Cancel
                </Button>

                <Button
                  variant="danger"
                  loading={busyId !== null}
                  onClick={() => void remove()}
                >
                  Delete permanently
                </Button>
              </>
            }
          >
            <p className="text-sm text-ink-600 dark:text-ink-300">
              {deleting?.title} will be permanently deleted.
              This cannot be undone.
            </p>
          </Modal>
        </>
      )}
    </div>
  );
}
