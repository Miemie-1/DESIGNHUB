import {
  api, clearSession, fmtDate, fmtShort, getToken, getUser, initialsOf, naira,
  setSession, statusLabel, toInputDate, updateStoredUser,
} from '@/lib/api';

const mockFetch = (status, body) => {
  const fn = vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: body === undefined ? () => Promise.reject(new Error('no json')) : () => Promise.resolve(body),
  });
  vi.stubGlobal('fetch', fn);
  return fn;
};

const stubLocation = () => {
  const assign = vi.fn();
  vi.stubGlobal('location', { ...window.location, assign });
  return assign;
};

afterEach(() => vi.unstubAllGlobals());

describe('session storage', () => {
  it('stores and clears token and user', () => {
    setSession('tok', { name: 'Ada' });
    expect(getToken()).toBe('tok');
    expect(getUser()).toEqual({ name: 'Ada' });
    clearSession();
    expect(getToken()).toBeNull();
    expect(getUser()).toBeNull();
  });

  it('getUser tolerates corrupt JSON', () => {
    localStorage.setItem('designhub_user', '{nope');
    expect(getUser()).toBeNull();
  });

  it('updateStoredUser persists and notifies the shell', () => {
    const listener = vi.fn();
    window.addEventListener('designhub:user', listener);
    updateStoredUser({ name: 'New' });
    expect(getUser()).toEqual({ name: 'New' });
    expect(listener).toHaveBeenCalledOnce();
    window.removeEventListener('designhub:user', listener);
  });
});

describe('api()', () => {
  it('calls /api<path> with JSON headers and no auth when signed out', async () => {
    const fetch = mockFetch(200, { ok: 1 });
    await expect(api('/clients')).resolves.toEqual({ ok: 1 });
    const [url, opts] = fetch.mock.calls[0];
    expect(url).toBe('/api/clients');
    expect(opts.method).toBe('GET');
    expect(opts.headers).toEqual({ 'Content-Type': 'application/json' });
    expect(opts.body).toBeUndefined();
  });

  it('adds the bearer token', async () => {
    setSession('abc', {});
    const fetch = mockFetch(200, {});
    await api('/clients');
    expect(fetch.mock.calls[0][1].headers.Authorization).toBe('Bearer abc');
  });

  it('serialises the body and builds a query string, dropping empty params', async () => {
    const fetch = mockFetch(200, {});
    await api('/clients', {
      method: 'POST',
      body: { name: 'A' },
      params: { search: 'x y', page: 2, status: '', q: undefined, n: null },
    });
    const [url, opts] = fetch.mock.calls[0];
    expect(url).toBe('/api/clients?search=x+y&page=2');
    expect(opts.body).toBe('{"name":"A"}');
  });

  it('keeps a param of 0', async () => {
    const fetch = mockFetch(200, {});
    await api('/x', { params: { page: 0 } });
    expect(fetch.mock.calls[0][0]).toBe('/api/x?page=0');
  });

  it('throws the server message on error', async () => {
    mockFetch(400, { message: 'Client name is required' });
    await expect(api('/clients', { method: 'POST' })).rejects.toThrow('Client name is required');
  });

  it('falls back to a generic message when the body is not JSON', async () => {
    mockFetch(502);
    await expect(api('/clients')).rejects.toThrow('Request failed');
  });

  it('on 401 with a session: clears it and redirects to /login', async () => {
    setSession('expired', { name: 'x' });
    mockFetch(401, { message: 'Invalid or expired token' });
    const assign = stubLocation();
    await expect(api('/clients')).rejects.toThrow('Invalid or expired token');
    expect(getToken()).toBeNull();
    expect(assign).toHaveBeenCalledWith('/login');
  });

  it('on 401 from /auth/* (bad login) does not clear or redirect', async () => {
    setSession('tok', {});
    mockFetch(401, { message: 'Invalid email or password' });
    const assign = stubLocation();
    await expect(api('/auth/login', { method: 'POST' })).rejects.toThrow('Invalid email or password');
    expect(getToken()).toBe('tok');
    expect(assign).not.toHaveBeenCalled();
  });

  it('on 401 without a token does not redirect', async () => {
    mockFetch(401, { message: 'Authentication required' });
    const assign = stubLocation();
    await expect(api('/clients')).rejects.toThrow();
    expect(assign).not.toHaveBeenCalled();
  });
});

describe('NEXT_PUBLIC_API_URL override', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it.each([
    ['https://api.example.com', 'https://api.example.com/api/clients'],
    ['https://api.example.com/', 'https://api.example.com/api/clients'],
    ['https://api.example.com/api', 'https://api.example.com/api/clients'],
  ])('normalises %s', async (override, expected) => {
    vi.stubEnv('NEXT_PUBLIC_API_URL', override);
    vi.resetModules();
    const fresh = await import('@/lib/api');
    const fetch = mockFetch(200, {});
    await fresh.api('/clients');
    expect(fetch.mock.calls[0][0]).toBe(expected);
  });
});

describe('formatters', () => {
  it('naira formats whole naira with grouping and handles empty values', () => {
    expect(naira(1234567.89)).toBe('₦1,234,568');
    expect(naira(0)).toBe('₦0');
    expect(naira(undefined)).toBe('₦0');
    expect(naira(null)).toBe('₦0');
  });

  it('date helpers render a dash for empty input', () => {
    expect(fmtDate(null)).toBe('—');
    expect(fmtShort('')).toBe('—');
    expect(toInputDate(undefined)).toBe('');
  });

  it('formats dates', () => {
    expect(fmtDate('2026-10-01T12:00:00Z')).toBe('Oct 01, 2026');
    expect(fmtShort('2026-10-01T12:00:00Z')).toBe('Oct 01');
    expect(toInputDate('2026-10-01T23:30:00Z')).toBe('2026-10-01');
  });

  it('initialsOf takes up to two initials, upper-cased', () => {
    expect(initialsOf('ada lovelace byron')).toBe('AL');
    expect(initialsOf('Ada')).toBe('A');
    expect(initialsOf('  ')).toBe('U');
    expect(initialsOf()).toBe('U');
  });

  it('statusLabel maps known and unknown statuses', () => {
    expect(statusLabel('in-progress')).toBe('In progress');
    expect(statusLabel('pending')).toBe('Pending');
    expect(statusLabel('')).toBe('');
    expect(statusLabel(undefined)).toBe('');
  });
});
