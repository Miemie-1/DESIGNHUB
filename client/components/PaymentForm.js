'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import ConfirmDialog from './ConfirmDialog';
import { api, toInputDate } from '@/lib/api';

const METHODS = ['Bank Transfer', 'Cash', 'Card', 'Mobile Money', 'Cheque', 'Other'];
const today = () => new Date().toISOString().slice(0, 10);

// Shared "Payment information" form. `?project=<id>` pre-selects client + project on the new page.
export default function PaymentForm({ initial, onSubmit, onDelete, submitLabel = 'Save Payment' }) {
  const router = useRouter();
  const preProject = useSearchParams().get('project') || '';
  const editing = !!initial;

  const [projects, setProjects] = useState([]);
  const [clientId, setClientId] = useState(initial?.project?.client?._id || '');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [form, setForm] = useState(() => ({
    project: initial?.project?._id || preProject,
    amount: initial?.amount ?? '',
    paymentDate: initial ? toInputDate(initial.paymentDate) : today(),
    method: initial?.method || 'Bank Transfer',
    reference: initial?.reference || '',
    notes: initial?.notes || '',
    status: initial?.status || 'paid',
  }));

  useEffect(() => {
    api('/projects')
      .then((list) => {
        setProjects(list);
        const pre = list.find((p) => p._id === preProject);
        if (pre && !editing) setClientId(pre.client?._id || '');
      })
      .catch((e) => setError(e.message));
  }, [preProject, editing]);

  // distinct clients that have projects
  const clients = [...new Map(projects.filter((p) => p.client).map((p) => [p.client._id, p.client])).values()];
  const clientProjects = projects.filter((p) => p.client?._id === clientId);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      await onSubmit({ ...form, amount: Number(form.amount) });
      router.push('/payments');
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  };

  const remove = async () => {
    setDeleting(true);
    try {
      await onDelete();
      router.push('/payments');
    } catch (err) {
      setError(err.message);
      setDeleting(false);
      setConfirming(false);
    }
  };

  return (
    <form className="card form-card" onSubmit={submit}>
      <div className="card-title">Payment information</div>
      {error && <div className="error">{error}</div>}

      <div className="form-grid two">
        <div className="field">
          <label>Client</label>
          <select
            required disabled={editing} value={clientId}
            onChange={(e) => { setClientId(e.target.value); setForm({ ...form, project: '' }); }}
          >
            <option value="">Select client…</option>
            {clients.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
          </select>
        </div>
        <div className="field">
          <label>Project</label>
          <select required disabled={editing || !clientId} value={form.project} onChange={set('project')}>
            <option value="">{clientId ? 'Select project…' : 'Select a client first'}</option>
            {clientProjects.map((p) => <option key={p._id} value={p._id}>{p.name}</option>)}
            {editing && initial?.project && !clientProjects.length && (
              <option value={initial.project._id}>{initial.project.name}</option>
            )}
          </select>
        </div>
        <div className="field">
          <label>Amount (₦)</label>
          <input type="number" min="0" required placeholder="50000" value={form.amount} onChange={set('amount')} />
        </div>
        <div className="field">
          <label>Payment date</label>
          <input type="date" required value={form.paymentDate} onChange={set('paymentDate')} />
        </div>
        <div className="field">
          <label>Payment method</label>
          <select value={form.method} onChange={set('method')}>
            {METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
        <div className="field">
          <label>Reference</label>
          <input placeholder="e.g. TRX-000123" value={form.reference} onChange={set('reference')} />
        </div>
        <div className="field">
          <label>Status</label>
          <select value={form.status} onChange={set('status')}>
            <option value="paid">Paid</option>
            <option value="partial">Partial</option>
            <option value="pending">Pending</option>
          </select>
        </div>
        <div className="field span-2">
          <label>Notes</label>
          <textarea rows={4} placeholder="Optional payment note..." value={form.notes} onChange={set('notes')} />
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
          title="Delete this payment?"
          message={'This payment record will be permanently removed.'}
          confirmLabel="Delete payment"
          busy={deleting}
          onConfirm={remove}
          onCancel={() => setConfirming(false)}
        />
      )}
    </form>
  );
}
