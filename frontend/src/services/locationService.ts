
import { apiRequest } from './apiClient';

export type LocationSearchMode = 'city' | 'place';

export interface LocationSearchResult {
    name: string;
    latitude: number;
    longitude: number;
}

export async function searchNepalLocations(
    query: string,
    mode: LocationSearchMode,
    accessToken: string
): Promise<LocationSearchResult[]> {
    const params = new URLSearchParams({
        q: query,
        mode,
    });

    return apiRequest<LocationSearchResult[]>(
        `/api/locations/search?${params.toString()}`,
        {
            method: 'GET',
            token: accessToken,
        }
    );
}
