import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ApiError } from '@/services/apiClient';
import { getComplaintById } from '@/services/complaintService';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

import {
  getMyNotifications,
  type NotificationApiResponse,
} from '@/services/notificationService';

interface Props {
  accessToken: string | null;
}

export function StaffLatestNotifications({
  accessToken,
}: Props) {
  const [notifications, setNotifications] =
    useState<NotificationApiResponse[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  const navigate = useNavigate();
  const [checkingId, setCheckingId] = useState<string | null>(null);
  const [accessErrors, setAccessErrors] =
    useState<Record<string, string>>({});


  useEffect(() => {
    let cancelled = false;

    setNotifications([]);
    setLoading(true);
    setError(null);

    if (!accessToken) {
      setError('Please sign in to view notifications.');
      setLoading(false);

      return () => {
        cancelled = true;
      };
    }

    getMyNotifications(accessToken)
      .then((data) => {
        if (!cancelled) {
          setNotifications(data);
        }
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
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [accessToken, retryCount]);

  async function handleViewComplaint(
    notification: NotificationApiResponse
  ) {
    if (!accessToken || !notification.complaintId || checkingId) {
      return;
    }

    setCheckingId(notification.id);
    setAccessErrors((previous) => ({
      ...previous,
      [notification.id]: '',
    }));

    try {
      await getComplaintById(
        notification.complaintId,
        accessToken
      );

      navigate(
        `/staff/complaints/${encodeURIComponent(notification.complaintId)}`
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

      setAccessErrors((previous) => ({
        ...previous,
        [notification.id]: message,
      }));
    } finally {
      setCheckingId(null);
    }
  }

  return (
    <Card className="p-5">
      <h3 className="text-sm font-semibold text-ink-900 dark:text-ink-100">
        Latest Notifications
      </h3>

      <p className="mt-1 text-xs text-ink-500">
        Recent notifications for your staff account.
      </p>

      {loading && (
        <p role="status" className="mt-4 text-sm text-ink-500">
          Loading notifications...
        </p>
      )}

      {!loading && error && (
        <div role="alert" className="mt-4 space-y-3">
          <p className="text-sm text-error-600">
            {error}
          </p>

          {accessToken && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setRetryCount((count) => count + 1)}
            >
              Retry
            </Button>
          )}
        </div>
      )}

      {!loading && !error && notifications.length === 0 && (
        <p className="mt-4 rounded-xl bg-ink-50 p-4 text-center text-sm text-ink-500 dark:bg-ink-800/50">
          No notifications yet.
        </p>
      )}

      {!loading && !error && notifications.length > 0 && (
        <ul className="mt-4 space-y-3">
          {notifications.slice(0, 3).map((notification) => (
            <li
              key={notification.id}
              className="rounded-xl border border-ink-100 p-3 dark:border-ink-800"
            >
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-semibold text-ink-900 dark:text-ink-100">
                  {notification.title}
                </p>

                {!notification.isRead && (
                  <span className="shrink-0 rounded-full bg-primary-50 px-2 py-0.5 text-xs text-primary-600">
                    Unread
                  </span>
                )}
              </div>

              <p className="mt-2 break-words text-xs text-ink-600 dark:text-ink-300">
                {notification.message}
              </p>

              <p className="mt-2 text-xs text-ink-400">
                {new Date(notification.createdAtUtc).toLocaleString()}
              </p>

              {notification.complaintId && (
                <div className="mt-2">
                  <button
                    type="button"
                    disabled={checkingId !== null || !accessToken}
                    onClick={() => void handleViewComplaint(notification)}
                    className="text-xs font-medium text-primary-600 hover:underline disabled:opacity-50"
                  >
                    {checkingId === notification.id
                      ? 'Checking access...'
                      : 'View complaint →'}
                  </button>

                  {accessErrors[notification.id] && (
                    <p
                      role="alert"
                      className="mt-2 text-xs text-error-600"
                    >
                      {accessErrors[notification.id]}
                    </p>
                  )}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
