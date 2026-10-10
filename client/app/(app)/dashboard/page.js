'use client';

import { useEffect, useState } from 'react';
import { api, fmtDate, naira } from '@/lib/api';
import { PageLoading } from '@/components/Loading';

export default function DashboardPage() {
  const [stats, setStats] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api('/dashboard/stats').then(setStats).catch((e) => setError(e.message));
  }, []);

  if (error) return <div className="error">{error}</div>;
  if (!stats) return <PageLoading />;

  const cards = [
    ['Clients', stats.totalClients],
    ['Projects', stats.totalProjects],
    ['Overdue projects', stats.overdueProjects],
    ['Total billed', naira(stats.totalBilled)],
    ['Payments received', naira(stats.totalReceived)],
    ['Outstanding', naira(stats.outstanding)],
  ];

  return (
    <>
      <div className="grid">
        {cards.map(([label, value]) => (
          <div key={label} className="card stat">
            <div className="label">{label}</div>
            <div className="value">{value}</div>
          </div>
        ))}
      </div>

      <div className="grid">
        <div className="card">
          <h3 style={{ marginTop: 0 }}>Projects by status</h3>
          {Object.keys(stats.projectsByStatus).length === 0 && <p className="muted">No projects yet.</p>}
          {Object.entries(stats.projectsByStatus).map(([status, count]) => (
            <p key={status} style={{ display: 'flex', justifyContent: 'space-between', margin: '6px 0' }}>
              <span className={`badge ${status}`}>{status}</span>
              <strong>{count}</strong>
            </p>
          ))}
        </div>

        <div className="card" style={{ gridColumn: 'span 2' }}>
          <h3 style={{ marginTop: 0 }}>Upcoming deadlines</h3>
          {stats.upcomingDeadlines.length === 0 && <p className="muted">No upcoming deadlines.</p>}
          {stats.upcomingDeadlines.map((p) => (
            <p key={p._id} style={{ display: 'flex', justifyContent: 'space-between', margin: '6px 0' }}>
              <span>{p.name} <span className="muted">· {p.client?.name}</span></span>
              <strong>{fmtDate(p.deadline)}</strong>
            </p>
          ))}
        </div>
      </div>
    </>
  );
}
