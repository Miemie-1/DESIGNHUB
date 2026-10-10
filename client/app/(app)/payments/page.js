'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api, fmtShort, naira, statusLabel } from '@/lib/api';
import { RowsLoading } from '@/components/Loading';

export default function PaymentsPage() {
  const router = useRouter();
  const [summary, setSummary] = useState(null);
  const [payments, setPayments] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([api('/payments/summary'), api('/payments')])
      .then(([s, list]) => {
        setSummary(s);
        setPayments(list);
      })
      .catch((e) => setError(e.message));
  }, []);

  return (
    <>
      <div className="page-actions">
        <Link href="/payments/new" className="btn">+ Record Payment</Link>
      </div>

      {error && <div className="error">{error}</div>}

      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))' }}>
        <div className="card stat-card">
          <div className="label">Total received</div>
          <div className="value">{naira(summary?.totalReceivedThisYear)}</div>
          <div className="sub success" style={{ fontWeight: 600 }}>This year</div>
        </div>
        <div className="card stat-card">
          <div className="label">Pending</div>
          <div className="value">{naira(summary?.pendingAmount)}</div>
          <div className="sub warn" style={{ fontWeight: 600 }}>{summary?.outstandingProjects ?? 0} outstanding</div>
        </div>
        <div className="card stat-card">
          <div className="label">Transactions</div>
          <div className="value">{summary?.transactions ?? 0}</div>
          <div className="sub primary">Recorded payments</div>
        </div>
      </div>

      <div className="card flush">
        <div className="table-wrap" style={{ border: 'none', borderRadius: 0 }}>
          <table className="data-table">
            <thead>
              <tr><th>Date</th><th>Client</th><th>Project</th><th>Method</th><th>Amount</th><th>Status</th></tr>
            </thead>
            <tbody>
              {!payments && <RowsLoading colSpan={6} />}
              {payments && payments.length === 0 && <tr><td colSpan={6} className="muted">No payments recorded yet.</td></tr>}
              {(payments || []).map((p) => (
                <tr key={p._id} className="clickable" onClick={() => router.push(`/payments/${p._id}/edit`)}>
                  <td className="muted">{fmtShort(p.paymentDate)}</td>
                  <td><strong>{p.project?.client?.name || '—'}</strong></td>
                  <td><strong>{p.project?.name || '—'}</strong></td>
                  <td className="muted">{p.method || '—'}</td>
                  <td className="muted">{naira(p.amount)}</td>
                  <td><span className={`badge ${p.status}`}>{statusLabel(p.status)}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
