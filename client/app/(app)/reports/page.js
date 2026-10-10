'use client';

import { useEffect, useState } from 'react';
import { api, fmtDate, naira } from '@/lib/api';
import { PageLoading } from '@/components/Loading';

export default function ReportsPage() {
  const [tab, setTab] = useState('projects');
  const [filters, setFilters] = useState({ from: '', to: '', status: '' });
  const [report, setReport] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api(`/reports/${tab}`, { params: filters })
      .then((data) => {
        setError('');
        setReport(data);
      })
      .catch((e) => setError(e.message));
  }, [tab, filters]);

  const set = (k) => (e) => setFilters({ ...filters, [k]: e.target.value });
  const switchTab = (t) => {
    setReport(null);
    setFilters({ from: '', to: '', status: '' });
    setTab(t);
  };

  const statuses = tab === 'projects'
    ? ['pending', 'in-progress', 'review', 'completed', 'cancelled']
    : ['paid', 'partial', 'pending'];

  return (
    <>
      <div className="page-actions">
        <button className="no-print" onClick={() => window.print()}>Print / Save PDF</button>
      </div>

      <div className="toolbar no-print">
        <button className={tab === 'projects' ? '' : 'secondary'} onClick={() => switchTab('projects')}>Project report</button>
        <button className={tab === 'payments' ? '' : 'secondary'} onClick={() => switchTab('payments')}>Payment report</button>
      </div>

      <div className="toolbar no-print">
        <div><label>From</label><input type="date" value={filters.from} onChange={set('from')} /></div>
        <div><label>To</label><input type="date" value={filters.to} onChange={set('to')} /></div>
        <div>
          <label>Status</label>
          <select value={filters.status} onChange={set('status')}>
            <option value="">All</option>
            {statuses.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>

      {error && <div className="error">{error}</div>}
      {!report && !error && <PageLoading />}

      {report && tab === 'projects' && (
        <>
          <div className="grid">
            <div className="card stat"><div className="label">Projects</div><div className="value">{report.count}</div></div>
            <div className="card stat"><div className="label">Total value</div><div className="value">{naira(report.totalAmount)}</div></div>
            <div className="card stat"><div className="label">Paid</div><div className="value">{naira(report.totalPaid)}</div></div>
            <div className="card stat"><div className="label">Balance</div><div className="value">{naira(report.totalAmount - report.totalPaid)}</div></div>
          </div>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Project</th><th>Client</th><th>Deadline</th><th>Status</th><th>Amount</th><th>Paid</th><th>Balance</th></tr></thead>
              <tbody>
                {report.rows.length === 0 && <tr><td colSpan={7} className="muted">No data.</td></tr>}
                {report.rows.map((r) => (
                  <tr key={r._id}>
                    <td>{r.name}</td>
                    <td>{r.client?.name || '—'}</td>
                    <td>{fmtDate(r.deadline)}</td>
                    <td><span className={`badge ${r.status}`}>{r.status}</span></td>
                    <td>{naira(r.amount)}</td>
                    <td>{naira(r.amountPaid)}</td>
                    <td>{naira(r.balance)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {report && tab === 'payments' && (
        <>
          <div className="grid">
            <div className="card stat"><div className="label">Payments</div><div className="value">{report.count}</div></div>
            <div className="card stat"><div className="label">Total</div><div className="value">{naira(report.total)}</div></div>
          </div>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Date</th><th>Project</th><th>Amount</th><th>Status</th></tr></thead>
              <tbody>
                {report.rows.length === 0 && <tr><td colSpan={4} className="muted">No data.</td></tr>}
                {report.rows.map((r) => (
                  <tr key={r._id}>
                    <td>{fmtDate(r.paymentDate)}</td>
                    <td>{r.project?.name || '—'}</td>
                    <td>{naira(r.amount)}</td>
                    <td><span className={`badge ${r.status}`}>{r.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </>
  );
}
