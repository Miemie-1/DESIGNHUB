import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const router = { replace: vi.fn(), push: vi.fn() };
let pathname = '/dashboard';
vi.mock('next/navigation', () => ({
  useRouter: () => router,
  usePathname: () => pathname,
}));
vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }) => <a href={href} {...rest}>{children}</a>,
}));
vi.mock('@/lib/api', async (orig) => ({ ...(await orig()), api: vi.fn() }));

import { api, getToken, getUser, setSession, updateStoredUser } from '@/lib/api';
import LoginPage from '@/app/login/page';
import RegisterPage from '@/app/register/page';
import AppShell from '@/components/AppShell';

describe('LoginPage', () => {
  it('signs in, stores the session and goes to the dashboard', async () => {
    api.mockResolvedValue({ token: 't1', user: { name: 'Ada' } });
    render(<LoginPage />);
    await userEvent.type(screen.getByPlaceholderText('mary@example.com'), 'ada@x.com');
    await userEvent.type(screen.getByPlaceholderText('••••••••••'), 'secret1');
    await userEvent.click(screen.getByRole('button', { name: 'Sign In' }));

    expect(api).toHaveBeenCalledWith('/auth/login', {
      method: 'POST',
      body: { email: 'ada@x.com', password: 'secret1' },
    });
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith('/dashboard'));
    expect(getToken()).toBe('t1');
    expect(getUser()).toEqual({ name: 'Ada' });
  });

  it('shows the server error and re-enables the form', async () => {
    api.mockRejectedValue(new Error('Invalid email or password'));
    render(<LoginPage />);
    await userEvent.type(screen.getByPlaceholderText('mary@example.com'), 'a@b.com');
    await userEvent.type(screen.getByPlaceholderText('••••••••••'), 'bad');
    await userEvent.click(screen.getByRole('button', { name: 'Sign In' }));

    expect(await screen.findByText('Invalid email or password')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sign In' })).toBeEnabled();
    expect(router.replace).not.toHaveBeenCalled();
    expect(getToken()).toBeNull();
  });

  it('"Continue as demo" uses the demo endpoint', async () => {
    api.mockResolvedValue({ token: 'demo', user: { name: 'Demo' } });
    render(<LoginPage />);
    await userEvent.click(screen.getByRole('button', { name: 'Continue as demo' }));
    expect(api).toHaveBeenCalledWith('/auth/demo', { method: 'POST', body: undefined });
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith('/dashboard'));
  });

  it('"Forgot password?" shows an info message instead of navigating', async () => {
    render(<LoginPage />);
    await userEvent.click(screen.getByText('Forgot password?'));
    expect(screen.getByText(/not available yet/)).toBeInTheDocument();
  });
});

describe('RegisterPage', () => {
  it('renders a registration form', () => {
    render(<RegisterPage />);
    expect(screen.getByRole('button', { name: /create|register|sign up/i })).toBeInTheDocument();
  });
});

describe('AppShell route guard', () => {
  it('redirects to /login and renders nothing without a token', async () => {
    const { container } = render(<AppShell><p>secret</p></AppShell>);
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith('/login'));
    expect(container).toBeEmptyDOMElement();
    expect(screen.queryByText('secret')).not.toBeInTheDocument();
  });

  it('renders the shell, page title and children for a signed-in user', async () => {
    setSession('t', { name: 'Ada Lovelace' });
    pathname = '/clients/new';
    render(<AppShell><p>child content</p></AppShell>);
    expect(await screen.findByText('child content')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Add New Client' })).toBeInTheDocument();
    expect(screen.getAllByText('AL').length).toBeGreaterThan(0);
    expect(screen.getByRole('link', { name: 'Clients' })).toHaveAttribute('aria-current', 'page');
  });

  it('search submits to /clients?search=…', async () => {
    setSession('t', { name: 'Ada' });
    pathname = '/dashboard';
    render(<AppShell><p>x</p></AppShell>);
    const box = await screen.findByLabelText('Search clients');
    await userEvent.type(box, 'apex foods{Enter}');
    expect(router.push).toHaveBeenCalledWith('/clients?search=apex%20foods');
  });

  it('logout clears the session and returns to /login', async () => {
    setSession('t', { name: 'Ada' });
    render(<AppShell><p>x</p></AppShell>);
    await userEvent.click(await screen.findByRole('button', { name: 'Log out' }));
    expect(getToken()).toBeNull();
    expect(router.replace).toHaveBeenCalledWith('/login');
  });

  it('updates the avatar when the stored user changes', async () => {
    setSession('t', { name: 'Ada Lovelace' });
    render(<AppShell><p>x</p></AppShell>);
    await screen.findByText('x');
    updateStoredUser({ name: 'Grace Hopper' });
    await waitFor(() => expect(screen.getAllByText('GH').length).toBeGreaterThan(0));
  });
});
