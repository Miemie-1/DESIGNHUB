const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

export const getToken = () =>
  typeof window === 'undefined' ? null : localStorage.getItem('designhub_token');

export const setSession = (token, user) => {
  localStorage.setItem('designhub_token', token);
  localStorage.setItem('designhub_user', JSON.stringify(user));
};

export const clearSession = () => {
  localStorage.removeItem('designhub_token');
  localStorage.removeItem('designhub_user');
};

export const getUser = () => {
  try {
    return JSON.parse(localStorage.getItem('designhub_user'));
  } catch {
    return null;
  }
};

// Update the cached user and tell the app shell (sidebar / avatar) to refresh.
export const updateStoredUser = (user) => {
  localStorage.setItem('designhub_user', JSON.stringify(user));
  window.dispatchEvent(new Event('designhub:user'));
};

export async function api(path, { method = 'GET', body, params } = {}) {
  const query = params
    ? '?' +
      new URLSearchParams(
        Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== '')
      ).toString()
    : '';
  const token = getToken();

  const res = await fetch(`${API_URL}${path}${query}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await res.json().catch(() => ({}));
  if (res.status === 401 && token && !path.startsWith('/auth/')) {
    clearSession();
    window.location.assign('/login');
  }
  if (!res.ok) throw new Error(data.message || 'Request failed');
  return data;
}

export const naira = (n) =>
  '₦' + new Intl.NumberFormat('en-NG', { maximumFractionDigits: 0 }).format(n || 0);

const fmt = (d, opts) => (d ? new Date(d).toLocaleDateString('en-US', opts) : '—');
// Oct 01, 2026
export const fmtDate = (d) => fmt(d, { month: 'short', day: '2-digit', year: 'numeric' });
// Oct 01
export const fmtShort = (d) => fmt(d, { month: 'short', day: '2-digit' });

export const toInputDate = (d) => (d ? new Date(d).toISOString().slice(0, 10) : '');

export const initialsOf = (name = '') =>
  name.split(' ').filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('') || 'U';

export const STATUS_LABEL = {
  'in-progress': 'In progress',
};
export const statusLabel = (s) =>
  STATUS_LABEL[s] || (s ? s.charAt(0).toUpperCase() + s.slice(1) : '');
