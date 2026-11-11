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

/**
 * Retrieve all staff accounts, including inactive staff.
 * Admin only.
 */
export async function getAllStaff(
  accessToken: string
): Promise<StaffApiResponse[]> {
  return apiRequest<StaffApiResponse[]>(
    '/api/users/staff',
    {
      method: 'GET',
      token: accessToken,
    }
  );
}

export interface CreateStaffAccountRequest {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
}

/**
 * Create a real staff account.
 * Admin only.
 */
export async function createStaffAccount(
  request: CreateStaffAccountRequest,
  accessToken: string
): Promise<StaffApiResponse> {
  return apiRequest<StaffApiResponse>(
    '/api/users/staff',
    {
      method: 'POST',
      token: accessToken,
      json: request,
    }
  );
}

/**
 * Activate or deactivate a staff account.
 * Admin only.
 */
export async function updateStaffActiveStatus(
  staffId: string,
  isActive: boolean,
  accessToken: string
): Promise<StaffApiResponse> {
  return apiRequest<StaffApiResponse>(
    `/api/users/staff/${encodeURIComponent(staffId)}/status`,
    {
      method: 'PATCH',
      token: accessToken,
      json: {
        isActive,
      },
    }
  );
}
