import { apiRequest } from './apiClient';

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
