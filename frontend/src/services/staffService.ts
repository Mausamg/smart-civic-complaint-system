import { apiRequest } from './apiClient';

/**
 * Staff account returned by the ASP.NET Core API.
 */
export interface StaffApiResponse {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  isActive: boolean;
  createdAtUtc: string;
}

/**
 * Admin-only active staff directory.
 *
 * GET /api/users/staff?isActive=true
 */
export async function getActiveStaff(
  accessToken: string
): Promise<StaffApiResponse[]> {
  return apiRequest<StaffApiResponse[]>(
    '/api/users/staff?isActive=true',
    {
      method: 'GET',
      token: accessToken,
    }
  );
}
