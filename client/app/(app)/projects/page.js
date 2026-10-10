'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api, fmtDate, naira, statusLabel } from '@/lib/api';
import { SearchIcon } from '@/components/Icons';
import { RowsLoading } from '@/components/Loading';

const STATUSES = ['pending', 'in-progress', 'review', 'completed', 'cancelled'];

export default function ProjectsPage() {
  const router = useRouter();
  const [projects, setProjects] = useState(null);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const t = setTimeout(() => {
      api('/projects', { params: { search, status } })
        .then((d) => {
          setError('');
          setProjects(d);
        })
        .catch((e) => setError(e.message));
    }, 250);
    return () => clearTimeout(t);
  }, [search, status]);

  const overdue = (p) =>
    p.deadline && new Date(p.deadline) < new Date() && !['completed', 'cancelled'].includes(p.status);

  return (
    <>
      <div className="list-bar">
        <label className="searchbar">
          <SearchIcon />
          <input
            placeholder="Search projects by name, type or description..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search projects"
          />
        </label>
        <select value={status} onChange={(e) => setStatus(e.target.value)} style={{ width: 170 }} aria-label="Filter by status">
          <option value="">All statuses</option>
          {STATUSES.map((s) => <option key={s} value={s}>{statusLabel(s)}</option>)}
        </select>
        <Link href="/projects/new" className="btn">+ New Project</Link>
      </div>

      {error && <div className="error">{error}</div>}

      <div className="card flush">
        <div className="table-wrap" style={{ border: 'none', borderRadius: 0 }}>
          <table className="data-table">
            <thead>
              <tr><th>Project</th><th>Client</th><th>Deadline</th><th>Progress</th><th>Budget</th><th>Status</th></tr>
            </thead>
            <tbody>
              {!projects && <RowsLoading colSpan={6} />}
              {projects && projects.length === 0 && <tr><td colSpan={6} className="muted">No projects found.</td></tr>}
              {(projects || []).map((p) => (
                <tr key={p._id} className="clickable" onClick={() => router.push(`/projects/${p._id}`)}>
                  <td><strong>{p.name}</strong>{p.type && <div className="muted">{p.type}</div>}</td>
                  <td className="muted">{p.client?.name || '—'}</td>
                  <td style={overdue(p) ? { color: 'var(--danger)', fontWeight: 600 } : undefined} className={overdue(p) ? '' : 'muted'}>
                    {fmtDate(p.deadline)}{overdue(p) && ' (overdue)'}
                  </td>
                  <td style={{ minWidth: 120 }}>
                    <div className="progress" style={{ height: 6 }}><div style={{ width: `${p.progress || 0}%` }} /></div>
                    <span className="muted" style={{ fontSize: 11 }}>{p.progress || 0}%</span>
                  </td>
                  <td className="muted">{naira(p.amount)}</td>
                  <td><span className={`badge ${p.status}`}>{statusLabel(p.status)}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="table-foot">
          <span>{projects?.length ?? 0} project{projects?.length === 1 ? '' : 's'}</span>
        </div>
      </div>
    </>
  );
}
