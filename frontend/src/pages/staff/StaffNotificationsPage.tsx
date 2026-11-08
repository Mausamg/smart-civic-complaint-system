import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Check, CheckCheck } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { ApiError } from '@/services/apiClient';
import { getComplaintById } from '@/services/complaintService';
import {
  getMyNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  type NotificationApiResponse,
} from '@/services/notificationService';

type Filter = 'all' | 'unread' | 'read';

export function StaffNotificationsPage() {
  const { accessToken } = useApp();
  const navigate = useNavigate();

  const [items, setItems] = useState<NotificationApiResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [filter, setFilter] = useState<Filter>('all');

  const [busyId, setBusyId] = useState<string | null>(null);
  const [markingAll, setMarkingAll] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [itemErrors, setItemErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    let cancelled = false;

    setItems([]);
    setError(null);
    setActionError(null);
    setItemErrors({});
    setLoading(true);

    if (!accessToken) {
      setError('Please sign in to view notifications.');
      setLoading(false);
      return;
    }

    getMyNotifications(accessToken)
      .then((data) => {
        if (!cancelled) setItems(data);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : 'Unable to load notifications.'
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [accessToken, retryCount]);

  const unreadCount = items.filter((item) => !item.isRead).length;

  const filtered = items.filter((item) => {
    if (filter === 'unread') return !item.isRead;
    if (filter === 'read') return item.isRead;
    return true;
  });

  async function handleMarkRead(id: string) {
    if (!accessToken || busyId || markingAll) return;

    setBusyId(id);
    setItemErrors((previous) => ({ ...previous, [id]: '' }));

    try {
      await markNotificationAsRead(id, accessToken);

      setItems((previous) =>
        previous.map((item) =>
          item.id === id ? { ...item, isRead: true } : item
        )
      );
    } catch (err: unknown) {
      setItemErrors((previous) => ({
        ...previous,
        [id]: err instanceof Error
          ? err.message
          : 'Unable to mark notification as read.',
      }));
    } finally {
      setBusyId(null);
    }
  }

  async function handleMarkAllRead() {
    if (!accessToken || busyId || markingAll || unreadCount === 0) return;

    setMarkingAll(true);
    setActionError(null);

    try {
      await markAllNotificationsAsRead(accessToken);
      setItems((previous) =>
        previous.map((item) => ({ ...item, isRead: true }))
      );
    } catch (err: unknown) {
      setActionError(
        err instanceof Error
          ? err.message
          : 'Unable to mark all notifications as read.'
      );
    } finally {
      setMarkingAll(false);
    }
  }

  async function handleViewComplaint(item: NotificationApiResponse) {
    if (!accessToken || !item.complaintId || busyId || markingAll) return;

    setBusyId(item.id);
    setItemErrors((previous) => ({ ...previous, [item.id]: '' }));

    try {
      await getComplaintById(item.complaintId, accessToken);

      navigate(
        `/staff/complaints/${encodeURIComponent(item.complaintId)}`
      );
    } catch (err: unknown) {
      let message = 'Unable to open this complaint. Please try again.';

      if (err instanceof ApiError && err.status === 403) {
        message =
          'You no longer have access to this complaint. ' +
          'It may have been reassigned.';
      } else if (err instanceof ApiError && err.status === 404) {
        message = 'This complaint is no longer available.';
      } else if (err instanceof Error) {
        message = err.message;
      }

      setItemErrors((previous) => ({
        ...previous,
        [item.id]: message,
      }));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div>
      <PageHeader
        title="Staff Notifications"
        subtitle={`${unreadCount} unread of ${items.length} notifications.`}
        breadcrumbs={[
          { label: 'Dashboard', to: '/staff/dashboard' },
          { label: 'Notifications' },
        ]}
      />

      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <label className="flex items-center gap-2 text-sm text-ink-600">
          <span>Show</span>
          <select
            value={filter}
            onChange={(event) => setFilter(event.target.value as Filter)}
            className="rounded-lg border border-ink-200 bg-white px-3 py-2 text-ink-700"
          >
            <option value="all">All notifications</option>
            <option value="unread">Unread</option>
            <option value="read">Read</option>
          </select>
        </label>

        <button
          type="button"
          onClick={() => void handleMarkAllRead()}
          disabled={loading || unreadCount === 0 || markingAll || busyId !== null}
          className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          <CheckCheck className="h-4 w-4" />
          {markingAll ? 'Updating...' : 'Mark all as read'}
        </button>
      </div>

      {actionError && (
        <p role="alert" className="mb-4 text-sm text-error-600">
          {actionError}
        </p>
      )}

      {loading ? (
        <p role="status" className="py-8 text-center text-ink-500">
          Loading notifications...
        </p>
      ) : error ? (
        <div role="alert" className="rounded-xl border border-ink-200 p-5">
          <p className="mb-3 text-sm text-error-600">{error}</p>
          <button
            type="button"
            onClick={() => setRetryCount((count) => count + 1)}
            className="rounded-lg bg-primary-600 px-4 py-2 text-sm text-white"
          >
            Try again
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-ink-200 p-8 text-center">
          <Bell className="mx-auto mb-3 h-8 w-8 text-ink-400" />
          <p className="font-medium text-ink-700">
            No notifications to display.
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {filtered.map((item) => (
            <li key={item.id}>
              <Card className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="break-words text-sm font-semibold text-ink-900 dark:text-ink-100">
                      {item.title}
                    </h2>

                    <p className="mt-2 break-words text-sm text-ink-600 dark:text-ink-300">
                      {item.message}
                    </p>

                    <p className="mt-2 text-xs text-ink-400">
                      {new Date(item.createdAtUtc).toLocaleString()}
                    </p>
                  </div>

                  <span className="shrink-0 text-xs font-medium text-primary-600">
                    {item.isRead ? 'Read' : 'Unread'}
                  </span>
                </div>

                <div className="mt-4 flex flex-wrap gap-4">
                  {item.complaintId && (
                    <button
                      type="button"
                      disabled={busyId !== null || markingAll}
                      onClick={() => void handleViewComplaint(item)}
                      className="text-xs font-medium text-primary-600 hover:underline disabled:opacity-50"
                    >
                      {busyId === item.id
                        ? 'Please wait...'
                        : 'View complaint →'}
                    </button>
                  )}

                  {!item.isRead && (
                    <button
                      type="button"
                      disabled={busyId !== null || markingAll}
                      onClick={() => void handleMarkRead(item.id)}
                      className="inline-flex items-center gap-1 text-xs font-medium text-ink-600 hover:text-primary-600 disabled:opacity-50"
                    >
                      <Check className="h-3.5 w-3.5" />
                      Mark as read
                    </button>
                  )}
                </div>

                {itemErrors[item.id] && (
                  <p role="alert" className="mt-3 text-xs text-error-600">
                    {itemErrors[item.id]}
                  </p>
                )}
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
