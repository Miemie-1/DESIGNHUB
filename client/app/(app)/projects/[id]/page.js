'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { api, fmtDate, naira, statusLabel } from '@/lib/api';
import { PageLoading } from '@/components/Loading';

export default function ProjectDetailsPage() {
  const { id } = useParams();
  const [project, setProject] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api(`/projects/${id}`).then(setProject).catch((e) => setError(e.message));
  }, [id]);

  if (error) return <div className="error">{error}</div>;
  if (!project) return <PageLoading />;

  const progress = project.progress || 0;

  return (
    <>
      <Link href="/projects" className="back-link">‹ Back to Projects</Link>

      <div className="card head-card" style={{ marginBottom: 20 }}>
        <div>
          <h2>{project.name}</h2>
          <span className={`badge lg ${project.status}`}>{statusLabel(project.status)}</span>
          <div className="meta">
            Client:{' '}
            {project.client ? <Link href={`/clients/${project.client._id}`}>{project.client.name}</Link> : '—'}
            {' • '}Created: {fmtDate(project.createdAt)}
          </div>
        </div>
        <Link href={`/projects/${project._id}/edit`} className="btn secondary">Edit Project</Link>
      </div>

      <div className="progress-wrap">
        <div className="progress-head">
          <span>Project progress</span>
          <span className="pct">{progress}%</span>
        </div>
        <div className="progress" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}>
          <div style={{ width: `${progress}%` }} />
        </div>
      </div>

      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
        <div className="card stat-card"><div className="label">Start date</div><div className="value md">{fmtDate(project.startDate)}</div></div>
        <div className="card stat-card"><div className="label">Deadline</div><div className="value md">{fmtDate(project.deadline)}</div></div>
        <div className="card stat-card"><div className="label">Budget</div><div className="value md">{naira(project.amount)}</div></div>
        <div className="card stat-card"><div className="label">Amount paid</div><div className="value md">{naira(project.totalPaid)}</div></div>
      </div>

      <div className="two-col">
        <div className="card">
          <div className="card-title">Project description</div>
          <p className="muted" style={{ marginTop: -6 }}>{project.description || 'No description added.'}</p>

          {project.deliverables?.length > 0 && (
            <>
              <div className="card-title" style={{ marginTop: 24, marginBottom: 0 }}>Deliverables</div>
              <ul className="dot-list">
                {project.deliverables.map((d, i) => <li key={i}>{d}</li>)}
              </ul>
            </>
          )}
        </div>

        <div className="card">
          <div className="card-title">Payment summary</div>
          <div className="summary-item"><div className="k">Total project</div><div className="v">{naira(project.amount)}</div></div>
          <div className="summary-item"><div className="k">Paid</div><div className="v text-success">{naira(project.totalPaid)}</div></div>
          <div className="summary-item"><div className="k">Outstanding</div><div className="v text-warn">{naira(project.balance)}</div></div>
          <Link href={`/payments/new?project=${project._id}`} className="btn small">+ Record payment</Link>
        </div>
      </div>
    </>
  );
}
