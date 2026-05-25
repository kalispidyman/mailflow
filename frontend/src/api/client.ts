const API_BASE = '/api';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const token = localStorage.getItem('token');
  const headers: Record<string, string> = {
    ...(options?.headers as Record<string, string>),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  if (!(options?.body instanceof FormData)) {
    headers['Content-Type'] = 'application/x-www-form-urlencoded';
  }

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  if (res.status === 401) {
    if (path !== '/auth/login') {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    throw new Error('Unauthorized');
  }
  if (res.status === 303) return {} as T;
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || 'Request failed');
  return data;
}

function encodeBody(data: Record<string, string>) {
  return new URLSearchParams(data);
}

export const api = {
  auth: {
    login: (username: string, password: string) =>
      request<any>('/auth/login', { method: 'POST', body: encodeBody({ username, password }) }),
    register: (data: Record<string, string>) =>
      request<any>('/auth/register', { method: 'POST', body: encodeBody(data) }),
    me: () => request<any>('/auth/me'),
  },
  google: {
    url: () => request<{ url: string }>('/auth/google/url'),
  },
  outlook: {
    url: () => request<{ url: string }>('/auth/outlook/url'),
  },
  emails: {
    list: (params?: { folder?: string; account_id?: number; limit?: number; offset?: number }) => {
      const q = new URLSearchParams();
      if (params?.folder) q.set('folder', params.folder);
      if (params?.account_id) q.set('account_id', String(params.account_id));
      if (params?.limit) q.set('limit', String(params.limit));
      if (params?.offset) q.set('offset', String(params.offset));
      return request<any>(`/emails?${q}`);
    },
    search: (q: string) => request<any>(`/emails/search?q=${encodeURIComponent(q)}`),
    get: (id: number) => request<any>(`/emails/${id}`),
    assign: (id: number, userId: number) =>
      request<any>(`/emails/${id}/assign`, { method: 'POST', body: encodeBody({ user_id: String(userId) }) }),
    followup: (id: number, note: string, dueDate?: string) =>
      request<any>(`/emails/${id}/followup`, { method: 'POST', body: encodeBody({ note, due_date: dueDate || '' }) }),
    label: (id: number, name: string, color?: string) =>
      request<any>(`/emails/${id}/label`, { method: 'POST', body: encodeBody({ name, color: color || '#3B82F6' }) }),
    send: (data: Record<string, string>) =>
      request<any>('/emails/send', { method: 'POST', body: encodeBody(data) }),
    analytics: () => request<any>('/emails/analytics/overview'),
    toggleRead: (id: number, isRead: boolean) =>
      request<any>(`/emails/${id}/read`, { method: 'POST', body: encodeBody({ is_read: isRead ? 'true' : 'false' }) }),
    delete: (id: number) => request<any>(`/emails/${id}`, { method: 'DELETE' }),
    restore: (id: number) => request<any>(`/emails/${id}/restore`, { method: 'PUT' }),
  },
  accounts: {
    list: () => request<any[]>('/accounts'),
    sync: (id: number) => request<any>(`/accounts/${id}/sync`, { method: 'POST' }),
    syncAll: () => request<any>('/accounts/sync-all', { method: 'POST' }),
    delete: (id: number) => request<any>(`/accounts/${id}`, { method: 'DELETE' }),
  },
  team: {
    list: () => request<any[]>('/team'),
    invite: (data: Record<string, string>) =>
      request<any>('/team/invite', { method: 'POST', body: encodeBody(data) }),
  },
};
