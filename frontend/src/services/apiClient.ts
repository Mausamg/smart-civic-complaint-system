
const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  'http://localhost:7001';


export class ApiError extends Error {
  public readonly status: number;

  constructor(message: string, status: number) {
    super(message);

    this.name = 'ApiError';
    this.status = status;
  }
}


export interface ApiRequestOptions
  extends Omit<RequestInit, 'body'> {
  token?: string;
  json?: unknown;
  onUnauthorized?: () => void;
}

export async function apiRequest<T>(
  endpoint: string,
  options: ApiRequestOptions = {}
): Promise<T> {
  const {
    token,
    json,
    onUnauthorized,
    headers: customHeaders,
    ...requestOptions
  } = options;

  const headers = new Headers(customHeaders);

  if (json !== undefined) {
    headers.set('Content-Type', 'application/json');
  }

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  let response: Response;

  try {
    response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...requestOptions,
      headers,
      body: json !== undefined
        ? JSON.stringify(json)
        : undefined,
    });
  } catch {
    throw new ApiError(
      'Unable to connect to the server.',
      0
    );
  }

  const data: unknown = await response
    .json()
    .catch(() => null);

  if (!response.ok) {
    if (response.status === 401 && token) {
      onUnauthorized?.();
    }

    const errorData =
      data && typeof data === 'object'
        ? data as Record<string, unknown>
        : null;

    const validationErrors = errorData?.errors;

    const firstValidationError =
      validationErrors &&
      typeof validationErrors === 'object'
        ? Object.values(validationErrors)
            .flat()
            .find((item): item is string =>
              typeof item === 'string'
            )
        : undefined;

    const message =
      (typeof errorData?.message === 'string'
        ? errorData.message
        : undefined) ||
      firstValidationError ||
      (typeof errorData?.title === 'string'
        ? errorData.title
        : undefined) ||
      `Request failed (${response.status}).`;

    throw new ApiError(message, response.status);
  }

  return data as T;
}
