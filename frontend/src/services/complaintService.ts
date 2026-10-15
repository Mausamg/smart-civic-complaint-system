
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
