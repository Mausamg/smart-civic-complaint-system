
import { apiRequest } from './apiClient';

/**
 * Response from the ASP.NET Core Complaints API.
 *
 * Keep backend DTO types separate from the
 * frontend's existing Complaint UI model.
 */
export interface ComplaintApiResponse {
  id: string;
  title: string;
  description: string;
  category: string;
  location: string;
  status: string;
  priority: string;
  createdAt: string;
  updatedAt: string | null;
  submittedByUserId: string;
  assignedToUserId: string | null;
}

/**
 * Retrieve complaints belonging to the
 * currently authenticated Citizen.
 *
 * The backend determines ownership from
 * the validated JWT, not a frontend user ID.
 */
export async function getMyComplaints(
  accessToken: string
): Promise<ComplaintApiResponse[]> {
  return apiRequest<ComplaintApiResponse[]>(
    '/api/complaints/my',
    {
      method: 'GET',
      token: accessToken,
    }
  );
}

export async function getComplaintById(
    complaintId: string,
    accessToken: string
): Promise<ComplaintApiResponse> {
  return apiRequest<ComplaintApiResponse>(
      `/api/complaints/${encodeURIComponent(complaintId)}`,
      {
        method: 'GET',
        token: accessToken,
      }
  );
}


export interface CreateComplaintRequest {
    title: string;
    description: string;
    category: string;
    location: string;

    subcategory?: string | null;
    observedAt?: string | null;
    affectedPeopleRange?: string | null;
    isActive?: boolean | null;

    municipality?: string | null;
    ward?: string | null;
    latitude?: number | null;
    longitude?: number | null;
}

export interface CreatedComplaintResponse {
  id: string;
  title: string;
  description: string;
  category: string;
  location: string;
  status: string;
  priority: string;
  createdAt: string;
}
export async function createComplaint(
  request: CreateComplaintRequest,
  accessToken: string
): Promise<CreatedComplaintResponse> {
  return apiRequest<CreatedComplaintResponse>(
    '/api/complaints',
    {
      method: 'POST',
      token: accessToken,
      json: request,
    }
  );
}
