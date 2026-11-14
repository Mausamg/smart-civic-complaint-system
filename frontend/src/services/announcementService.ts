import { apiRequest } from './apiClient';

export type AnnouncementCategory =
  | 'general'
  | 'emergency'
  | 'maintenance'
  | 'policy'
  | 'event';

export type AnnouncementLocationScope = 'all' | 'local';

export interface AnnouncementApiResponse {
  id: string;
  title: string;
  body: string;
  category: AnnouncementCategory;
  locationScope: AnnouncementLocationScope;
  country: string | null;
  province: string | null;
  district: string | null;
  municipality: string | null;
  ward: string | null;
  isFeatured: boolean;
  isPublished: boolean;
  publishedAtUtc: string | null;
  expiresAtUtc: string | null;
  createdAtUtc: string;
  updatedAtUtc: string | null;
  author: string;
}

export interface AnnouncementSaveRequest {
  title: string;
  body: string;
  category: AnnouncementCategory;
  locationScope: AnnouncementLocationScope;
  country: string | null;
  province: string | null;
  district: string | null;
  municipality: string | null;
  ward: string | null;
  isFeatured: boolean;
  expiresAtUtc: string | null;
}

export const ANNOUNCEMENTS_CHANGED_EVENT =
  'civiclink:announcements-changed';

export const ANNOUNCEMENTS_FEED_CHANGED_EVENT =
  'civiclink:announcements-feed-changed';

export const ANNOUNCEMENTS_FEED_STORAGE_KEY =
  'civiclink:announcements-feed-revision';

function notifyAnnouncementFeedChanged(): void {
  if (typeof window === 'undefined') return;

  // Notify the tab that performed the change.
  window.dispatchEvent(
    new Event(ANNOUNCEMENTS_FEED_CHANGED_EVENT)
  );

  // Notify other tabs on the same origin/profile.
  try {
    window.localStorage.setItem(
      ANNOUNCEMENTS_FEED_STORAGE_KEY,
      `${Date.now()}-${Math.random()}`
    );
  } catch {
    // Polling remains available when storage is blocked.
  }
}

export async function getUnreadAnnouncementCount(
  token: string
): Promise<number> {
  const result = await apiRequest<{ unreadCount: number }>(
    '/api/announcements/unread-count',
    { method: 'GET', token }
  );

  return result.unreadCount;
}

export async function markAnnouncementAsRead(
  id: string,
  token: string
): Promise<void> {
  await apiRequest<{ id: string; isRead: boolean }>(
    `/api/announcements/${encodeURIComponent(id)}/read`,
    { method: 'POST', token }
  );

  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new Event(ANNOUNCEMENTS_CHANGED_EVENT)
    );
  }
}

export async function getPublishedAnnouncements(
  signal?: AbortSignal
): Promise<AnnouncementApiResponse[]> {
  return apiRequest<AnnouncementApiResponse[]>(
    '/api/announcements',
    { method: 'GET', signal, cache: 'no-store' }
  );
}

export async function getManagedAnnouncements(
  token: string,
  signal?: AbortSignal
): Promise<AnnouncementApiResponse[]> {
  return apiRequest<AnnouncementApiResponse[]>(
    '/api/announcements/manage',
    { method: 'GET', token, signal, cache: 'no-store' }
  );
}

export async function createAnnouncement(
  token: string,
  body: AnnouncementSaveRequest
): Promise<AnnouncementApiResponse> {
  return apiRequest<AnnouncementApiResponse>(
    '/api/announcements',
    { method: 'POST', token, json: body }
  );
}

export async function updateAnnouncement(
  token: string,
  id: string,
  body: AnnouncementSaveRequest
): Promise<AnnouncementApiResponse> {
  const result = await apiRequest<AnnouncementApiResponse>(
    `/api/announcements/${encodeURIComponent(id)}`,
    { method: 'PUT', token, json: body }
  );

  notifyAnnouncementFeedChanged();
  return result;
}

export async function setAnnouncementPublished(
  token: string,
  id: string,
  isPublished: boolean
): Promise<AnnouncementApiResponse> {
  const result = await apiRequest<AnnouncementApiResponse>(
    `/api/announcements/${encodeURIComponent(id)}/publish`,
    {
      method: 'PATCH',
      token,
      json: { isPublished },
    }
  );

  notifyAnnouncementFeedChanged();
  return result;
}

export async function deleteAnnouncement(
  token: string,
  id: string
): Promise<void> {
  await apiRequest<unknown>(
    `/api/announcements/${encodeURIComponent(id)}`,
    { method: 'DELETE', token }
  );

  notifyAnnouncementFeedChanged();
}
