'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { clearSession, getToken, getUser, initialsOf } from '@/lib/api';
import ThemeToggle from '@/components/ThemeToggle';
import {
  BellIcon, ClientsIcon, DashboardIcon, LogoutIcon, PaymentsIcon,
  ProjectsIcon, ReportsIcon, SearchIcon, SettingsIcon,
} from '@/components/Icons';

const MAIN_NAV = [
  { href: '/dashboard', label: 'Dashboard', Icon: DashboardIcon },
  { href: '/clients', label: 'Clients', Icon: ClientsIcon },
  { href: '/projects', label: 'Projects', Icon: ProjectsIcon },
  { href: '/payments', label: 'Payments', Icon: PaymentsIcon },
  { href: '/reports', label: 'Reports', Icon: ReportsIcon },
];
const SYSTEM_NAV = [{ href: '/settings', label: 'Settings', Icon: SettingsIcon }];

// Page title + subtitle shown in the top bar (first match wins).
const PAGE_META = [
  [/^\/dashboard/, 'Dashboard', 'Overview of your clients, projects and payments'],
  [/^\/clients\/new/, 'Add New Client', 'Create a new client record'],
  [/^\/clients\/[^/]+\/edit/, 'Edit Client', 'Update this client record'],
  [/^\/clients\/[^/]+/, 'Client Details', 'Client profile and project history'],
  [/^\/clients/, 'Clients', 'Manage your client records'],
  [/^\/projects\/new/, 'New Project', 'Create a project for a client'],
  [/^\/projects\/[^/]+\/edit/, 'Edit Project', 'Update this project'],
  [/^\/projects\/[^/]+/, 'Project Details', 'Manage project progress and payment'],
  [/^\/projects/, 'Projects', 'Track design projects and deadlines'],
  [/^\/payments\/new/, 'Record Payment', 'Add a payment to a project'],
  [/^\/payments\/[^/]+\/edit/, 'Edit Payment', 'Update this payment record'],
  [/^\/payments/, 'Payments', 'Track payments and outstanding balances'],
  [/^\/reports/, 'Reports', 'Project and payment summaries'],
  [/^\/settings/, 'Settings', 'Manage your account and workspace'],
];

export default function AppShell({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);
  const [q, setQ] = useState('');

  useEffect(() => {
    if (!getToken()) {
      router.replace('/login');
      return;
    }
    // localStorage is only readable in the browser, so session state is set after mount
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setUser(getUser());
    setReady(true);
  }, [router]);

  useEffect(() => {
    const refresh = () => setUser(getUser());
    window.addEventListener('designhub:user', refresh);
    return () => window.removeEventListener('designhub:user', refresh);
  }, []);

  if (!ready) return null;

  const [, title, subtitle] = PAGE_META.find(([rx]) => rx.test(pathname)) || [null, 'DesignHub', ''];

  const logout = () => {
    clearSession();
    router.replace('/login');
  };

  const search = (e) => {
    e.preventDefault();
    router.push(q.trim() ? `/clients?search=${encodeURIComponent(q.trim())}` : '/clients');
  };

  const renderLink = ({ href, label, Icon }) => (
    <Link key={href} href={href} className={pathname.startsWith(href) ? 'active' : ''}>
      <Icon />
      <span>{label}</span>
    </Link>
  );

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">DesignHub</div>
        <nav className="nav">
          <div className="nav-label">Main menu</div>
          {MAIN_NAV.map(renderLink)}
          <div className="nav-label spaced">System</div>
          {SYSTEM_NAV.map(renderLink)}
        </nav>
        <div className="sidebar-user">
          <div className="avatar">{initialsOf(user?.name)}</div>
          <div className="who">
            <div className="name">{user?.name}</div>
            <div className="role">Administrator</div>
          </div>
          <button className="logout" onClick={logout} aria-label="Log out" title="Log out">
            <LogoutIcon />
          </button>
        </div>
      </aside>

      <div className="content">
        <header className="topbar">
          <div>
            <h1>{title}</h1>
            <div className="subtitle">{subtitle}</div>
          </div>
          <div className="topbar-right">
            <form className="search" onSubmit={search} role="search">
              <SearchIcon />
              <input
                placeholder="Search..."
                value={q}
                onChange={(e) => setQ(e.target.value)}
                aria-label="Search clients"
              />
            </form>
            <ThemeToggle />
            <button className="icon-btn" aria-label="Notifications" title="Notifications"><BellIcon /></button>
            <div className="avatar" title={user?.name}>{initialsOf(user?.name)}</div>
          </div>
        </header>
        <main key={pathname} className="main">{children}</main>
      </div>
    </div>
  );
}
