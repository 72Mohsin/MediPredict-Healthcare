const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

function getToken(): string | null {
  return localStorage.getItem('medipredict_token');
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || 'Request failed');
  }

  if (res.status === 204) return undefined as T;
  return res.json();
}

export const api = {
  auth: {
    register: (username: string, password: string) =>
      request<{ token: string; user: { id: string; username: string; role: string } }>(
        '/auth/register', { method: 'POST', body: JSON.stringify({ username, password }) }
      ),
    login: (username: string, password: string) =>
      request<{ token: string; user: { id: string; username: string; role: string } }>(
        '/auth/login', { method: 'POST', body: JSON.stringify({ username, password }) }
      ),
    me: () => request<{ id: string; username: string; role: string }>('/auth/me'),
  },

  profile: {
    get: () => request<Record<string, unknown> | null>('/profile'),
    save: (data: Record<string, unknown>) =>
      request('/profile', { method: 'PUT', body: JSON.stringify(data) }),
  },

  predictions: {
    create: (symptoms: Array<{ name: string; severity: string }>, vitals?: Record<string, number>) =>
      request<Record<string, unknown>>('/predictions', {
        method: 'POST',
        body: JSON.stringify({ symptoms, vitals }),
      }),
    list: (limit = 50) => request<Record<string, unknown>[]>(`/predictions?limit=${limit}`),
    get: (id: string) => request<Record<string, unknown>>(`/predictions/${id}`),
  },

  chat: {
    send: (params: { message: string; session_id?: string; prediction_id?: string; symptoms?: string[] }) =>
      request<{ session_id: string; response: string }>('/chat', { method: 'POST', body: JSON.stringify(params) }),
    sessions: () => request<Record<string, unknown>[]>('/chat/sessions'),
    messages: (sessionId: string) =>
      request<Array<{ role: string; content: string; created_at: string }>>(`/chat/sessions/${sessionId}/messages`),
  },

  admin: {
    users: () => request<Record<string, unknown>[]>('/admin/users'),
    stats: () => request<Record<string, unknown>>('/admin/stats'),
    updateRole: (userId: string, role: string) =>
      request(`/admin/users/${userId}/role`, { method: 'PUT', body: JSON.stringify({ role }) }),
    deleteUser: (userId: string) =>
      request(`/admin/users/${userId}`, { method: 'DELETE' }),
  },

  health: () => request<{ status: string; ollama: string; model: string }>('/health'),
};
