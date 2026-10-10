'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, clearSession, getUser, initialsOf, updateStoredUser } from '@/lib/api';
import { applyTheme, getStoredTheme } from '@/lib/theme';
import PasswordInput from '@/components/PasswordInput';

const TABS = ['Profile', 'Account', 'Notifications', 'Security'];
const THEMES = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
  { value: 'system', label: 'System' },
];

function ProfileTab() {
  const [form, setForm] = useState({ name: '', email: '', phone: '', workspaceName: '' });
  const [msg, setMsg] = useState({ type: '', text: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const u = getUser() || {};
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setForm({
      name: u.name || '',
      email: u.email || '',
      phone: u.phone || '',
      workspaceName: u.workspaceName || 'DesignHub',
    });
  }, []);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMsg({ type: '', text: '' });
    try {
      const { user } = await api('/auth/me', { method: 'PUT', body: form });
      updateStoredUser(user);
      setMsg({ type: 'success', text: 'Profile updated.' });
    } catch (err) {
      setMsg({ type: 'error', text: err.message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={save}>
      <div className="profile-photo">
        <span className="avatar-soft xl">{initialsOf(form.name)}</span>
        <button type="button" className="secondary" disabled title="Photo upload is not available yet">
          Change photo
        </button>
      </div>

      {msg.text && <div className={msg.type === 'error' ? 'error' : 'success-msg'}>{msg.text}</div>}

      <div className="form-grid two">
        <div className="field"><label>Full name</label><input required value={form.name} onChange={set('name')} /></div>
        <div className="field"><label>Email address</label><input type="email" required value={form.email} onChange={set('email')} /></div>
        <div className="field"><label>Phone number</label><input placeholder="+234 800 000 0000" value={form.phone} onChange={set('phone')} /></div>
        <div className="field"><label>Role</label><input readOnly value="Administrator" /></div>
        <div className="field span-2"><label>Workspace name</label><input value={form.workspaceName} onChange={set('workspaceName')} /></div>
      </div>

      <button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save Changes'}</button>
    </form>
  );
}

function AccountTab() {
  const router = useRouter();
  const [theme, setTheme] = useState('system');

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTheme(getStoredTheme());
  }, []);

  const choose = (value) => {
    applyTheme(value);
    setTheme(value);
  };

  return (
    <>
      <div className="card-title">Appearance</div>
      <p className="muted" style={{ marginTop: -8 }}>
        Choose how DesignHub looks. “System” follows your device setting.
      </p>
      <div className="theme-options">
        {THEMES.map(({ value, label }) => (
          <button
            key={value}
            type="button"
            className={`theme-option ${theme === value ? 'selected' : ''}`}
            onClick={() => choose(value)}
            aria-pressed={theme === value}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="card-title" style={{ marginTop: 36 }}>Session</div>
      <button
        type="button"
        className="secondary"
        onClick={() => {
          clearSession();
          router.replace('/login');
        }}
      >
        Log out
      </button>
    </>
  );
}

function NotificationsTab() {
  return (
    <>
      <div className="card-title">Notifications</div>
      <p className="muted" style={{ marginTop: -8 }}>
        Deadline reminders and payment alerts are planned for a future version. There is nothing to configure yet.
      </p>
    </>
  );
}

function SecurityTab() {
  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const [msg, setMsg] = useState({ type: '', text: '' });
  const [saving, setSaving] = useState(false);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const save = async (e) => {
    e.preventDefault();
    setMsg({ type: '', text: '' });
    if (form.newPassword !== form.confirm) {
      setMsg({ type: 'error', text: 'New passwords do not match.' });
      return;
    }
    setSaving(true);
    try {
      await api('/auth/password', {
        method: 'PUT',
        body: { currentPassword: form.currentPassword, newPassword: form.newPassword },
      });
      setForm({ currentPassword: '', newPassword: '', confirm: '' });
      setMsg({ type: 'success', text: 'Password updated.' });
    } catch (err) {
      setMsg({ type: 'error', text: err.message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={save} style={{ maxWidth: 420 }}>
      <div className="card-title">Change password</div>
      {msg.text && <div className={msg.type === 'error' ? 'error' : 'success-msg'}>{msg.text}</div>}
      <div className="field"><label>Current password</label><PasswordInput required autoComplete="current-password" value={form.currentPassword} onChange={set('currentPassword')} /></div>
      <div className="field"><label>New password</label><PasswordInput required minLength={6} autoComplete="new-password" value={form.newPassword} onChange={set('newPassword')} /></div>
      <div className="field"><label>Confirm new password</label><PasswordInput required minLength={6} autoComplete="new-password" value={form.confirm} onChange={set('confirm')} /></div>
      <button type="submit" disabled={saving}>{saving ? 'Updating…' : 'Update password'}</button>
    </form>
  );
}

export default function SettingsPage() {
  const [tab, setTab] = useState('Profile');

  return (
    <div className="card">
      <div className="tabs" role="tablist">
        {TABS.map((t) => (
          <button
            key={t}
            role="tab"
            aria-selected={tab === t}
            className={tab === t ? 'active' : ''}
            onClick={() => setTab(t)}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === 'Profile' && <ProfileTab />}
      {tab === 'Account' && <AccountTab />}
      {tab === 'Notifications' && <NotificationsTab />}
      {tab === 'Security' && <SecurityTab />}
    </div>
  );
}
