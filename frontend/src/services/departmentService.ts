import { apiRequest } from './apiClient';
import type { ComplaintCategory, Priority } from '@/types';

/**
 * Backend priority enum:
 * Low, Medium, High, Critical.
 *
 * The frontend labels Critical as Urgent.
 */
export type DepartmentApiPriority =
  | 'Low'
  | 'Medium'
  | 'High'
  | 'Critical';

const priorityToApi: Record<Priority, DepartmentApiPriority> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  urgent: 'Critical',
};

const priorityFromApi: Record<DepartmentApiPriority, Priority> = {
  Low: 'low',
  Medium: 'medium',
  High: 'high',
  Critical: 'urgent',
};

export function toDepartmentApiPriority(
  priority: Priority
): DepartmentApiPriority {
  return priorityToApi[priority];
}

export function fromDepartmentApiPriority(
  priority: DepartmentApiPriority
): Priority {
  return priorityFromApi[priority];
}

/**
 * Response returned by the real Department API.
 *
 * Kept separate from the existing mock Department UI type.
 */
export interface DepartmentApiResponse {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;

  headStaffUserId: string | null;
  headStaffName: string | null;

  expectedResolutionDays: number;
  defaultPriority: DepartmentApiPriority;

  categoryKeys: ComplaintCategory[];

  staffCount: number;
  activeComplaints: number;
  averageResolutionDays: number | null;

  createdAtUtc: string;
  updatedAtUtc: string | null;
}

/**
 * Create and update share the same backend request model.
 */
export interface DepartmentSaveRequest {
  name: string;
  description?: string | null;
  headStaffUserId?: string | null;
  expectedResolutionDays: number;
  defaultPriority: DepartmentApiPriority;
  categoryKeys: ComplaintCategory[];
}

export async function getDepartments(
  accessToken: string,
  signal?: AbortSignal
): Promise<DepartmentApiResponse[]> {
  return apiRequest<DepartmentApiResponse[]>(
    '/api/departments',
    {
      method: 'GET',
      token: accessToken,
      signal,
    }
  );
}

export async function getDepartmentById(
  departmentId: string,
  accessToken: string
): Promise<DepartmentApiResponse> {
  return apiRequest<DepartmentApiResponse>(
    `/api/departments/${encodeURIComponent(departmentId)}`,
    {
      method: 'GET',
      token: accessToken,
    }
  );
}

export async function createDepartment(
  request: DepartmentSaveRequest,
  accessToken: string
): Promise<DepartmentApiResponse> {
  return apiRequest<DepartmentApiResponse>(
    '/api/departments',
    {
      method: 'POST',
      token: accessToken,
      json: request,
    }
  );
}

export async function updateDepartment(
  departmentId: string,
  request: DepartmentSaveRequest,
  accessToken: string
): Promise<DepartmentApiResponse> {
  return apiRequest<DepartmentApiResponse>(
    `/api/departments/${encodeURIComponent(departmentId)}`,
    {
      method: 'PUT',
      token: accessToken,
      json: request,
    }
  );
}

export async function setDepartmentActive(
  departmentId: string,
  isActive: boolean,
  accessToken: string
): Promise<DepartmentApiResponse> {
  return apiRequest<DepartmentApiResponse>(
    `/api/departments/${encodeURIComponent(departmentId)}/active`,
    {
      method: 'PATCH',
      token: accessToken,
      json: { isActive },
    }
  );
}

export async function deleteDepartment(
  departmentId: string,
  accessToken: string
): Promise<void> {
  await apiRequest<unknown>(
    `/api/departments/${encodeURIComponent(departmentId)}`,
    {
      method: 'DELETE',
      token: accessToken,
    }
  );
}
