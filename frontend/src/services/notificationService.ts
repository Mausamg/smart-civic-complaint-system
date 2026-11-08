import { apiRequest } from './apiClient';

export const NOTIFICATIONS_CHANGED_EVENT =
  'civiclink:notifications-changed';

function emitNotificationsChanged(): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new Event(NOTIFICATIONS_CHANGED_EVENT)
    );
  }
}


/**
 * Notification returned by the ASP.NET Core API.
 */
export interface NotificationApiResponse {
  id: string;
  title: string;
  message: string;
  complaintId: string | null;
  isRead: boolean;
  createdAtUtc: string;
}

/**
 * Retrieve notifications belonging to
 * the authenticated user.
 */
export async function getMyNotifications(
  accessToken: string
): Promise<NotificationApiResponse[]> {
  return apiRequest<NotificationApiResponse[]>(
    '/api/notifications',
    {
      method: 'GET',
      token: accessToken,
    }
  );
}


/**
 * Mark one notification belonging to the
 * authenticated user as read.
 */
export interface MarkNotificationReadResponse {
  id: string;
  isRead: boolean;
}

export async function markNotificationAsRead(
  notificationId: string,
  accessToken: string
): Promise<MarkNotificationReadResponse> {
  const result = await apiRequest<MarkNotificationReadResponse>(
    `/api/notifications/${encodeURIComponent(notificationId)}/read`,
    {
      method: 'PATCH',
      token: accessToken,
    }
  );

  emitNotificationsChanged();
  return result;
}

/**
 * Mark all unread notifications belonging to
 * the authenticated user as read.
 */
export interface MarkAllNotificationsReadResponse {
  message: string;
  updatedCount: number;
}

export async function markAllNotificationsAsRead(
  accessToken: string
): Promise<MarkAllNotificationsReadResponse> {
  const result = await apiRequest<MarkAllNotificationsReadResponse>(
    '/api/notifications/read-all',
    {
      method: 'PATCH',
      token: accessToken,
    }
  );

  emitNotificationsChanged();
  return result;
}

/**
 * Retrieve the authenticated user's
 * unread notification count.
 */
export interface UnreadNotificationCountResponse {
  unreadCount: number;
}

export async function getUnreadNotificationCount(
  accessToken: string
): Promise<UnreadNotificationCountResponse> {
  return apiRequest<UnreadNotificationCountResponse>(
    '/api/notifications/unread-count',
    {
      method: 'GET',
      token: accessToken,
    }
  );
}
