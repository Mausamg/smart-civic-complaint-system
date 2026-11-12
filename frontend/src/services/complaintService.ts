import { apiRequest } from './apiClient';
/**
 * Response from the ASP.NET Core Complaints API.
 *
 * Keep backend DTO types separate from the
 * frontend's existing Complaint UI model.
 */
export interface ComplaintUserSummary {
    id: string;
    firstName: string;
    lastName: string;
    email: string | null;
}

export interface ComplaintApiResponse {
    id: string;
    title: string;
    description: string;
    category: string;
    location: string;
    departmentId: string | null;
    departmentName: string | null;

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
    submittedBy?: ComplaintUserSummary | null;
    assignedTo?: ComplaintUserSummary | null;
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

/**
 * Response from the admin department reassignment endpoint.
 */
export interface UpdateComplaintDepartmentResponse {
    id: string;
    category: string;
    departmentId: string;
    departmentName: string;
    status: string;
    updatedAt: string | null;
}

/**
 * Assign an existing complaint to an active department.
 * Requires an authenticated Admin access token.
 */
export async function updateComplaintDepartment(
    complaintId: string,
    departmentId: string,
    accessToken: string
): Promise<UpdateComplaintDepartmentResponse> {
    return apiRequest<UpdateComplaintDepartmentResponse>(
        `/api/complaints/${encodeURIComponent(complaintId)}/department`,
        {
            method: 'PATCH',
            token: accessToken,
            json: { departmentId },
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

/**
 * Admin-only complaint listing.
 * Supports backend pagination, filtering and sorting.
 */
export interface AdminComplaintsQuery {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: string;
  priority?: string;
  category?: string;
  location?: string;
  assignedToUserId?: string;
  sortBy?: 'createdAt' | 'title' | 'category' | 'status' | 'priority';
  sortDirection?: 'asc' | 'desc';
  createdFrom?: string;
  createdTo?: string;
}

export interface PaginatedComplaintsResponse {
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  items: ComplaintApiResponse[];
}

export async function getAdminComplaints(
  accessToken: string,
  query: AdminComplaintsQuery = {}
): Promise<PaginatedComplaintsResponse> {
  const params = new URLSearchParams();

  const append = (
    key: string,
    value: string | number | undefined
  ) => {
    if (value !== undefined && value !== '') {
      params.set(key, String(value));
    }
  };

  append('Page', query.page);
  append('PageSize', query.pageSize);
  append('Search', query.search);
  append('Status', query.status);
  append('Priority', query.priority);
  append('Category', query.category);
  append('Location', query.location);
  append('AssignedToUserId', query.assignedToUserId);
  append('SortBy', query.sortBy);
  append('SortDirection', query.sortDirection);
  append('CreatedFrom', query.createdFrom);
  append('CreatedTo', query.createdTo);

  const queryString = params.toString();

  const endpoint = queryString
    ? `/api/complaints?${queryString}`
    : '/api/complaints';

  return apiRequest<PaginatedComplaintsResponse>(
    endpoint,
    {
      method: 'GET',
      token: accessToken,
    }
  );
}

/**
 * Admin-only complaint assignment or reassignment.
 *
 * PATCH /api/complaints/{id}/assign
 */
export interface AssignComplaintResponse {
  id: string;
  status: string;
  assignedTo: ComplaintUserSummary;
  updatedAt: string | null;
}

export async function assignComplaint(
  complaintId: string,
  staffUserId: string,
  accessToken: string
): Promise<AssignComplaintResponse> {
  return apiRequest<AssignComplaintResponse>(
    `/api/complaints/${encodeURIComponent(complaintId)}/assign`,
    {
      method: 'PATCH',
      token: accessToken,
      json: {
        staffUserId,
      },
    }
  );
}

/**
 * Valid complaint priority values.
 */
export type ComplaintPriorityValue =
  | 'Low'
  | 'Medium'
  | 'High'
  | 'Critical';

/**
 * Response from the Admin priority update endpoint.
 */
export interface UpdateComplaintPriorityResponse {
  id: string;
  priority: ComplaintPriorityValue;
  updatedAt: string | null;
}

/**
 * Admin-only complaint priority update.
 *
 * PATCH /api/complaints/{id}/priority
 */
export async function updateComplaintPriority(
  complaintId: string,
  priority: ComplaintPriorityValue,
  accessToken: string
): Promise<UpdateComplaintPriorityResponse> {
  return apiRequest<UpdateComplaintPriorityResponse>(
    `/api/complaints/${encodeURIComponent(complaintId)}/priority`,
    {
      method: 'PATCH',
      token: accessToken,
      json: {
        priority,
      },
    }
  );
}
