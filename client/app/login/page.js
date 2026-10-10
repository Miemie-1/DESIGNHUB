'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api, setSession } from '@/lib/api';
import AuthSplit from '@/components/AuthSplit';
import PasswordInput from '@/components/PasswordInput';

export default function LoginPage() {
  const router = useRouter();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [loading, setLoading] = useState(false);

  const enter = async (path, body) => {
    setError('');
    setInfo('');
    setLoading(true);
    try {
      const { token, user } = await api(path, { method: 'POST', body });
      setSession(token, user);
      router.replace('/dashboard');
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  const submit = (e) => {
    e.preventDefault();
    enter('/auth/login', form);
  };

  return (
    <AuthSplit>
      <form className="auth-form" onSubmit={submit}>
        <h1>Welcome back</h1>
        <div className="sub">Sign in to your DesignHub account</div>

        {error && <div className="error">{error}</div>}
        {info && <div className="info">{info}</div>}

        <div className="field">
          <label>Email address</label>
          <input
            type="email" required placeholder="mary@example.com" autoComplete="email"
            value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
        </div>
        <div className="field">
          <label>Password</label>
          <PasswordInput
            required placeholder="••••••••••" autoComplete="current-password"
            value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })}
          />
        </div>
        <div className="forgot">
          <a
            href="#"
            onClick={(e) => {
              e.preventDefault();
              setInfo('Password reset by email is not available yet. Contact your workspace administrator.');
            }}
          >
            Forgot password?
          </a>
        </div>

        <button type="submit" className="btn-block" disabled={loading}>
          {loading ? 'Signing in…' : 'Sign In'}
        </button>

        <div className="or">or</div>

        <button type="button" className="secondary btn-block" disabled={loading} onClick={() => enter('/auth/demo')}>
          Continue as demo
        </button>

        <div className="switch">
          No account? <Link href="/register">Register</Link>
        </div>
        <div className="legal">DesignHub • Graphic Design Management</div>
      </form>
    </AuthSplit>
  );
}
