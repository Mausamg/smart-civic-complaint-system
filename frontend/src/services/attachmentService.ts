import { apiRequest } from './apiClient';

export interface ComplaintAttachmentResponse {
  id: string;
  complaintId: string;
  fileName: string;
  contentType: string;
  fileSize: number;
  createdAtUtc: string;
}

export async function uploadComplaintAttachment(
  complaintId: string,
  file: File,
  token: string
): Promise<ComplaintAttachmentResponse> {
  const formData = new FormData();

  formData.append('File', file, file.name);

  return apiRequest<ComplaintAttachmentResponse>(
    `/api/complaints/${encodeURIComponent(complaintId)}/attachments`,
    {
      method: 'POST',
      token,
      formData,
    }
  );
}
