import { apiRequest } from '@/services/apiClient';

/**
 * Administrator-only complaint map record.
 *
 * Coordinates are exact stored incident locations.
 * This response must never be reused by the public map.
 */
export interface AdminInternalMapComplaint {
  id: string;
  title: string;
  category: string;
  status: string;
  priority: string;
  location: string;
  municipality: string | null;
  ward: string | null;
  departmentId: string | null;
  departmentName: string | null;
  isAssigned: boolean;
  latitude: number;
  longitude: number;
  createdAt: string;
}

/**
 * Retrieve all complaints with valid map coordinates.
 *
 * GET /api/admin/internal-map/complaints
 *
 * The backend enforces administrator-only authorization.
 * Public consent and approval do not restrict this
 * private operational map.
 */
export function getAdminInternalMapComplaints(
  token: string,
  signal?: AbortSignal
): Promise<AdminInternalMapComplaint[]> {
  return apiRequest<AdminInternalMapComplaint[]>(
    '/api/admin/internal-map/complaints',
    {
      method: 'GET',
      token,
      signal,
      cache: 'no-store',
    }
  );
}
