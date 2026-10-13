
export interface AuthUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  roles: string[];
}

export interface LoginResponse {
  accessToken: string;
  user: AuthUser;
}

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  'http://localhost:7001';

export async function loginUser(
  email: string,
  password: string
): Promise<LoginResponse> {
  let response: Response;

  try {
    response = await fetch(`${API_BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: email.trim(),
        password,
      }),
    });
  } catch {
    throw new Error(
      'Unable to connect to the server. Please try again.'
    );
  }

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(
      data?.message ||
      Object.values(data?.errors || {}).flat()[0] ||
      data?.title ||
      'Login failed. Please try again.'
    );
  }

  return data as LoginResponse;
}
