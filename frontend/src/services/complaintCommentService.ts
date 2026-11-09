import { apiRequest } from './apiClient';

/**
 * A complaint comment returned by the backend.
 */
export interface ComplaintCommentApiResponse {
  id: string;
  complaintId: string;
  message: string;
  createdBy: {
    id: string;
    firstName: string;
    lastName: string;
  };
  createdAtUtc: string;
}

/**
 * Response after successfully posting a comment.
 */
export interface CreatedComplaintCommentResponse {
  id: string;
  complaintId: string;
  message: string;
  createdByUserId: string;
  createdAtUtc: string;
}

/**
 * Retrieve comments on a complaint the user
 * is authorized to access.
 */
export async function getComplaintComments(
  complaintId: string,
  accessToken: string
): Promise<ComplaintCommentApiResponse[]> {
  return apiRequest<ComplaintCommentApiResponse[]>(
    `/api/complaints/${encodeURIComponent(complaintId)}/comments`,
    {
      method: 'GET',
      token: accessToken,
    }
  );
}

/**
 * Submit a comment to an open complaint.
 *
 * The backend enforces ownership, staff assignment,
 * role authorization, and closed-complaint restrictions.
 */
export async function addComplaintComment(
  complaintId: string,
  message: string,
  accessToken: string
): Promise<CreatedComplaintCommentResponse> {
  const trimmedMessage = message.trim();

  if (!trimmedMessage || trimmedMessage.length > 1000) {
    throw new Error(
      'Message must contain between 1 and 1000 characters.'
    );
  }

  return apiRequest<CreatedComplaintCommentResponse>(
    `/api/complaints/${encodeURIComponent(complaintId)}/comments`,
    {
      method: 'POST',
      token: accessToken,
      json: {
        message: trimmedMessage,
      },
    }
  );
}
