'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import ConfirmDialog from './ConfirmDialog';

const EMPTY = { name: '', phone: '', email: '', businessName: '', address: '', notes: '', status: 'active' };

// Shared "Client information" form used by the Add and Edit client pages.
// Pass `onDelete` to show a Delete button (edit mode).
export default function ClientForm({ initial, onSubmit, onDelete, submitLabel = 'Save Client' }) {
  const router = useRouter();
  const [form, setForm] = useState(() => {
    const seed = { ...EMPTY };
    if (initial) for (const k of Object.keys(EMPTY)) if (initial[k] != null) seed[k] = initial[k];
    return seed;
  });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const editing = !!initial;

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      await onSubmit(form);
      router.push('/clients');
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  };

  const remove = async () => {
    setDeleting(true);
    try {
      await onDelete();
      router.push('/clients');
    } catch (err) {
      setError(err.message);
      setDeleting(false);
      setConfirming(false);
    }
  };

  return (
    <form className="card form-card" onSubmit={submit}>
      <div className="card-title">Client information</div>
      {error && <div className="error">{error}</div>}

      <div className="form-grid two">
        <div className="field">
          <label>Full name</label>
          <input required placeholder="e.g. Apex Foods" value={form.name} onChange={set('name')} />
        </div>
        <div className="field">
          <label>Phone number</label>
          <input placeholder="e.g. +234 800 000 0000" value={form.phone} onChange={set('phone')} />
        </div>
        <div className="field">
          <label>Email address</label>
          <input type="email" placeholder="e.g. hello@company.com" value={form.email} onChange={set('email')} />
        </div>
        <div className="field">
          <label>Company</label>
          <input placeholder="e.g. Apex Foods Ltd" value={form.businessName} onChange={set('businessName')} />
        </div>
        <div className="field">
          <label>Address</label>
          <input placeholder="Lagos, Nigeria" value={form.address} onChange={set('address')} />
        </div>
        {editing && (
          <div className="field">
            <label>Status</label>
            <select value={form.status} onChange={set('status')}>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        )}
        <div className="field span-2">
          <label>Notes</label>
          <textarea rows={5} placeholder="Type any notes about this client here..." value={form.notes} onChange={set('notes')} />
        </div>
      </div>

      <div className="actions">
        <button type="submit" disabled={saving}>{saving ? 'Saving…' : submitLabel}</button>
        <button type="button" className="secondary" onClick={() => router.back()}>Cancel</button>
        {onDelete && (
          <button type="button" className="danger" style={{ marginLeft: 'auto' }} onClick={() => setConfirming(true)}>Delete</button>
        )}
      </div>
      {onDelete && (
        <ConfirmDialog
          open={confirming}
          title="Delete this client?"
          message={`${form.name || 'This client'} will be permanently removed.`}
          confirmLabel="Delete client"
          busy={deleting}
          onConfirm={remove}
          onCancel={() => setConfirming(false)}
        />
      )}
    </form>
  );
}
