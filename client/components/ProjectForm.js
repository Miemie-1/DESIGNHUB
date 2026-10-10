'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import ConfirmDialog from './ConfirmDialog';
import { api, toInputDate } from '@/lib/api';

const STATUSES = ['pending', 'in-progress', 'review', 'completed', 'cancelled'];
const LABEL = { 'in-progress': 'In progress' };

const EMPTY = {
  name: '', client: '', type: '', amount: '', startDate: '', deadline: '',
  status: 'pending', progress: 0, description: '', deliverables: '',
};

// Shared project form (new + edit). `?client=<id>` pre-selects the client on the new page.
export default function ProjectForm({ initial, onSubmit, onDelete, submitLabel = 'Save Project' }) {
  const router = useRouter();
  const preselect = useSearchParams().get('client') || '';
  const [clients, setClients] = useState([]);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [form, setForm] = useState(() => {
    if (!initial) return { ...EMPTY, client: preselect };
    return {
      name: initial.name || '',
      client: initial.client?._id || initial.client || '',
      type: initial.type || '',
      amount: initial.amount ?? '',
      startDate: toInputDate(initial.startDate),
      deadline: toInputDate(initial.deadline),
      status: initial.status || 'pending',
      progress: initial.progress ?? 0,
      description: initial.description || '',
      deliverables: (initial.deliverables || []).join('\n'),
    };
  });

  useEffect(() => {
    api('/clients', { params: { limit: 1000 } })
      .then((d) => setClients(d.items))
      .catch((e) => setError(e.message));
  }, []);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    const body = {
      ...form,
      amount: Number(form.amount) || 0,
      progress: Math.min(100, Math.max(0, Number(form.progress) || 0)),
    };
    if (!body.startDate) delete body.startDate;
    if (!body.deadline) delete body.deadline;
    try {
      const saved = await onSubmit(body);
      router.push(`/projects/${saved._id}`);
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  };

  const remove = async () => {
    setDeleting(true);
    try {
      await onDelete();
      router.push('/projects');
    } catch (err) {
      setError(err.message);
      setDeleting(false);
      setConfirming(false);
    }
  };

  return (
    <form className="card form-card" onSubmit={submit}>
      <div className="card-title">Project information</div>
      {error && <div className="error">{error}</div>}

      <div className="form-grid two">
        <div className="field">
          <label>Project name</label>
          <input required placeholder="e.g. Brand Identity" value={form.name} onChange={set('name')} />
        </div>
        <div className="field">
          <label>Client</label>
          <select required value={form.client} onChange={set('client')}>
            <option value="">Select client…</option>
            {clients.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
          </select>
        </div>
        <div className="field">
          <label>Type</label>
          <input placeholder="e.g. Logo, Flyer, Branding" value={form.type} onChange={set('type')} />
        </div>
        <div className="field">
          <label>Budget (₦)</label>
          <input type="number" min="0" placeholder="120000" value={form.amount} onChange={set('amount')} />
        </div>
        <div className="field">
          <label>Start date</label>
          <input type="date" value={form.startDate} onChange={set('startDate')} />
        </div>
        <div className="field">
          <label>Deadline</label>
          <input type="date" value={form.deadline} onChange={set('deadline')} />
        </div>
        <div className="field">
          <label>Status</label>
          <select value={form.status} onChange={set('status')}>
            {STATUSES.map((s) => <option key={s} value={s}>{LABEL[s] || s[0].toUpperCase() + s.slice(1)}</option>)}
          </select>
        </div>
        <div className="field">
          <label>Progress ({form.progress}%)</label>
          <input
            type="range" min="0" max="100" step="5"
            value={form.progress} onChange={set('progress')}
            style={{ padding: 0 }}
          />
        </div>
        <div className="field span-2">
          <label>Description</label>
          <textarea rows={3} placeholder="What does this project involve?" value={form.description} onChange={set('description')} />
        </div>
        <div className="field span-2">
          <label>Deliverables (one per line)</label>
          <textarea rows={4} placeholder={'Logo concepts\nBrand color palette'} value={form.deliverables} onChange={set('deliverables')} />
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
          title="Delete this project?"
          message={`${form.name || 'This project'} and all of its payments will be permanently removed.`}
          confirmLabel="Delete project"
          busy={deleting}
          onConfirm={remove}
          onCancel={() => setConfirming(false)}
        />
      )}
    </form>
  );
}
