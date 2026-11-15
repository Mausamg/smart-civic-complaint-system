import { apiRequest } from '@/services/apiClient';

export interface PublicMapComplaint {
  id: string;
  category: string;
  status: string;
  municipality: string | null;
  ward: string | null;
  latitude: number | null;
  longitude: number | null;
  reportedAtUtc: string;
}

export function getPublicMapComplaints(
  signal?: AbortSignal
): Promise<PublicMapComplaint[]> {
  return apiRequest<PublicMapComplaint[]>(
    '/api/public/complaints/map',
    {
      method: 'GET',
      cache: 'no-store',
      signal,
    }
  );
}
