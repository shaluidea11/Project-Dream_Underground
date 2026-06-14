const API_BASE = '';

interface ApiOptions {
  method?: string;
  body?: unknown;
  headers?: Record<string, string>;
}

class ApiError extends Error {
  status: number;
  data: unknown;

  constructor(message: string, status: number, data?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

async function request<T>(endpoint: string, options: ApiOptions = {}): Promise<T> {
  const { method = 'GET', body, headers = {} } = options;

  // Read CSRF token from cookie for state-changing requests
  let csrfToken: string | undefined;
  if (typeof document !== 'undefined' && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
    const match = document.cookie.match(/csrf_token=([^;]+)/);
    if (match) csrfToken = match[1];
  }

  const res = await fetch(`${API_BASE}/api${endpoint}`, {
    method,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(csrfToken ? { 'X-CSRF-Token': csrfToken } : {}),
      ...headers,
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });

  if (!res.ok) {
    let data: unknown;
    try {
      data = await res.json();
    } catch {
      data = null;
    }
    const message =
      (data as any)?.message ||
      (Array.isArray((data as any)?.message) ? (data as any).message[0] : null) ||
      `Request failed with status ${res.status}`;
    throw new ApiError(message, res.status, data);
  }

  // Handle 204 No Content
  if (res.status === 204) return {} as T;

  return res.json();
}

export const api = {
  get: <T>(endpoint: string) => request<T>(endpoint),
  post: <T>(endpoint: string, body?: unknown) =>
    request<T>(endpoint, { method: 'POST', body }),
  put: <T>(endpoint: string, body?: unknown) =>
    request<T>(endpoint, { method: 'PUT', body }),
  patch: <T>(endpoint: string, body?: unknown) =>
    request<T>(endpoint, { method: 'PATCH', body }),
  delete: <T>(endpoint: string) =>
    request<T>(endpoint, { method: 'DELETE' }),
};

export { ApiError };
