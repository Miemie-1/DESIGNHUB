'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api, setSession } from '@/lib/api';
import AuthSplit from '@/components/AuthSplit';
import PasswordInput from '@/components/PasswordInput';

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { token, user } = await api('/auth/register', { method: 'POST', body: form });
      setSession(token, user);
      router.replace('/dashboard');
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <AuthSplit>
      <form className="auth-form" onSubmit={submit}>
        <h1>Create your account</h1>
        <div className="sub">Start managing your clients, projects and payments</div>

        {error && <div className="error">{error}</div>}

        <div className="field">
          <label>Full name</label>
          <input required placeholder="Mary Anuoluwatomiwa" autoComplete="name" value={form.name} onChange={set('name')} />
        </div>
        <div className="field">
          <label>Email address</label>
          <input type="email" required placeholder="mary@example.com" autoComplete="email" value={form.email} onChange={set('email')} />
        </div>
        <div className="field">
          <label>Password</label>
          <PasswordInput required minLength={6} placeholder="At least 6 characters" autoComplete="new-password" value={form.password} onChange={set('password')} />
        </div>

        <button type="submit" className="btn-block" disabled={loading}>
          {loading ? 'Creating…' : 'Create account'}
        </button>

        <div className="switch">
          Already registered? <Link href="/login">Sign in</Link>
        </div>
        <div className="legal">DesignHub • Graphic Design Management</div>
      </form>
    </AuthSplit>
  );
}
