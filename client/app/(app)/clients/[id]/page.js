'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { api, fmtShort, initialsOf, naira, statusLabel } from '@/lib/api';
import { PageLoading } from '@/components/Loading';

export default function ClientDetailsPage() {
  const { id } = useParams();
  const router = useRouter();
  const [client, setClient] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api(`/clients/${id}`).then(setClient).catch((e) => setError(e.message));
  }, [id]);

  if (error) return <div className="error">{error}</div>;
  if (!client) return <PageLoading />;

  const { stats } = client;
  const contact = [client.email, client.phone].filter(Boolean).join(' • ');

  return (
    <>
      <Link href="/clients" className="back-link">‹ Back to Clients</Link>

      <div className="card head-card">
        <div className="left">
          <span className="avatar-soft lg">{initialsOf(client.name)}</span>
          <div>
            <h2>{client.name}</h2>
            <span className={`badge lg ${client.status || 'active'}`}>{statusLabel(client.status || 'active')}</span>
            {contact && <div className="meta">{contact}</div>}
            {client.address && <div className="meta" style={{ marginTop: 4 }}>{client.address}</div>}
            {client.notes && <div className="meta" style={{ marginTop: 10, maxWidth: 560 }}>{client.notes}</div>}
          </div>
        </div>
        <Link href={`/clients/${client._id}/edit`} className="btn secondary">Edit Client</Link>
      </div>

      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))' }}>
        <div className="card stat-card">
          <div className="label">Total projects</div>
          <div className="value">{stats.totalProjects}</div>
          <div className="sub success">{stats.activeProjects} active • {stats.completedProjects} completed</div>
        </div>
        <div className="card stat-card">
          <div className="label">Total paid</div>
          <div className="value">{naira(stats.totalPaid)}</div>
          <div className="sub muted">All-time payments</div>
        </div>
        <div className="card stat-card">
          <div className="label">Outstanding</div>
          <div className="value">{naira(stats.outstanding)}</div>
          <div className="sub warn">
            {stats.pendingInvoices} pending invoice{stats.pendingInvoices === 1 ? '' : 's'}
          </div>
        </div>
      </div>

      <div className="card">
        <div className="section-head">
          <h3>Project history</h3>
          <Link href={`/projects/new?client=${client._id}`} className="btn">+ New Project</Link>
        </div>
        <div className="table-wrap" style={{ border: 'none' }}>
          <table className="data-table">
            <thead>
              <tr><th>Project</th><th>Deadline</th><th>Status</th><th>Amount</th></tr>
            </thead>
            <tbody>
              {client.projects.length === 0 && (
                <tr><td colSpan={4} className="muted">No projects for this client yet.</td></tr>
              )}
              {client.projects.map((p) => (
                <tr key={p._id} className="clickable" onClick={() => router.push(`/projects/${p._id}`)}>
                  <td><strong>{p.name}</strong></td>
                  <td className="muted">{fmtShort(p.deadline)}</td>
                  <td><span className={`badge ${p.status}`}>{statusLabel(p.status)}</span></td>
                  <td className="muted">{naira(p.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
