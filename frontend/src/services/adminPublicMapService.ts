import { apiRequest } from '@/services/apiClient';

export interface AdminPublicMapComplaint {
  id: string;
  title: string;
  category: string;
  status: string;
  municipality: string | null;
  ward: string | null;
  latitude: number | null;
  longitude: number | null;
  createdAt: string;
  isPublicMapApproved: boolean;
}

export function getAdminPublicMapComplaints(
  token: string,
  signal?: AbortSignal
): Promise<AdminPublicMapComplaint[]> {
  return apiRequest<AdminPublicMapComplaint[]>(
    '/api/admin/public-map/complaints',
    {
      method: 'GET',
      token,
      signal,
      cache: 'no-store',
    }
  );
}

export function setAdminPublicMapApproval(
  token: string,
  id: string,
  approved: boolean,
  privacyReviewed: boolean
): Promise<{
  id: string;
  isPublicMapApproved: boolean;
  status: string;
}> {
  return apiRequest(
    `/api/admin/public-map/complaints/${encodeURIComponent(id)}/approval`,
    {
      method: 'PATCH',
      token,
      json: {
        isApproved: approved,
        privacyReviewed,
      },
    }
  );
}
