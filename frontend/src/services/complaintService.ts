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

    subcategory: string | null;
    observedAt: string | null;
    affectedPeopleRange: string | null;
    isActive: boolean | null;

    municipality: string | null;
    ward: string | null;
    latitude: number | null;
    longitude: number | null;

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


/**
 * Retrieve active complaints assigned to the
 * currently authenticated Staff user.
 *
 * The backend determines the staff identity
 * from the validated JWT.
 */
export async function getAssignedComplaints(
  accessToken: string
): Promise<ComplaintApiResponse[]> {
  return apiRequest<ComplaintApiResponse[]>(
    '/api/complaints/assigned-to-me',
    {
      method: 'GET',
      token: accessToken,
    }
  );
}

/**
 * Statuses available for staff status-management requests.
 * The backend enforces valid transitions and assignment permissions.
 */
export type StaffStatusUpdate =
  | 'UnderReview'
  | 'InProgress'
  | 'Resolved'
  | 'Rejected';

export interface UpdateComplaintStatusResponse {
  id: string;
  status: string;
  updatedAt: string | null;
}

/**
 * Update a complaint's status using the authenticated
 * staff member's JWT.
 *
 * Notes are citizen-visible and limited to 500 characters.
 */
export async function updateComplaintStatus(
  complaintId: string,
  status: StaffStatusUpdate,
  accessToken: string,
  note?: string
): Promise<UpdateComplaintStatusResponse> {
  return apiRequest<UpdateComplaintStatusResponse>(
    `/api/complaints/${encodeURIComponent(complaintId)}/status`,
    {
      method: 'PATCH',
      token: accessToken,
      json: {
        status,
        note: note?.trim() || null,
      },
    }
  );
}

/**
 * A single complaint status change recorded by the backend.
 */
export interface ComplaintStatusHistoryResponse {
  id: string;
  oldStatus: string;
  newStatus: string;
  changedByUserId: string;
  changedByName: string;
  changedAtUtc: string;
  note: string | null;
}

/**
 * Retrieve the history of status changes
 * for a complaint accessible to the authenticated user.
 */
export async function getComplaintStatusHistory(
  complaintId: string,
  accessToken: string
): Promise<ComplaintStatusHistoryResponse[]> {
  return apiRequest<ComplaintStatusHistoryResponse[]>(
    `/api/complaints/${encodeURIComponent(complaintId)}/history`,
    {
      method: 'GET',
      token: accessToken,
    }
  );
}
