import { apiBlobRequest, apiRequest } from './apiClient';

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


export async function getComplaintAttachments(
  complaintId: string,
  token: string,
  signal?: AbortSignal
): Promise<ComplaintAttachmentResponse[]> {
  return apiRequest<ComplaintAttachmentResponse[]>(
    `/api/complaints/${encodeURIComponent(complaintId)}/attachments`,
    {
      method: 'GET',
      token,
      signal,
    }
  );
}

export async function downloadComplaintAttachment(
  complaintId: string,
  attachmentId: string,
  token: string,
  signal?: AbortSignal
): Promise<Blob> {
  return apiBlobRequest(
    `/api/complaints/${encodeURIComponent(complaintId)}/attachments/${encodeURIComponent(attachmentId)}`,
    token,
    signal
  );
}
