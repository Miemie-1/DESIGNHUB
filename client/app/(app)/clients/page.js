'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { api, initialsOf, naira, statusLabel } from '@/lib/api';
import { SearchIcon } from '@/components/Icons';
import { PageLoading, RowsLoading } from '@/components/Loading';

const PAGE_SIZE = 10;

function ClientsList() {
  const router = useRouter();
  const params = useSearchParams();
  const search = params.get('search') || '';
  const page = Math.max(1, parseInt(params.get('page'), 10) || 1);

  const [q, setQ] = useState(search);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  // keep the input in sync when the topbar search changes the URL
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setQ(search);
  }, [search]);

  // debounce typing -> URL
  useEffect(() => {
    if (q === search) return;
    const t = setTimeout(() => {
      router.replace(q ? `/clients?search=${encodeURIComponent(q)}` : '/clients');
    }, 300);
    return () => clearTimeout(t);
  }, [q, search, router]);

  useEffect(() => {
    api('/clients', { params: { search, page, limit: PAGE_SIZE } })
      .then((d) => {
        setError('');
        setData(d);
      })
      .catch((e) => setError(e.message));
  }, [search, page]);

  const href = (p) => {
    const sp = new URLSearchParams();
    if (search) sp.set('search', search);
    if (p > 1) sp.set('page', String(p));
    const qs = sp.toString();
    return qs ? `/clients?${qs}` : '/clients';
  };

  const items = data?.items || [];
  const pages = data?.pages || 1;

  return (
    <>
      <div className="list-bar">
        <label className="searchbar">
          <SearchIcon />
          <input
            placeholder="Search clients by name, email or company..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
            aria-label="Search clients"
          />
        </label>
        <Link href="/clients/new" className="btn">+ Add Client</Link>
      </div>

      {error && <div className="error">{error}</div>}

      <div className="card flush">
        <div className="table-wrap" style={{ border: 'none', borderRadius: 0 }}>
          <table className="data-table">
            <thead>
              <tr><th>Client</th><th>Contact</th><th>Projects</th><th>Total spent</th><th>Status</th></tr>
            </thead>
            <tbody>
              {!data && <RowsLoading colSpan={5} />}
              {data && items.length === 0 && (
                <tr><td colSpan={5} className="muted">No clients found.</td></tr>
              )}
              {items.map((c) => (
                <tr key={c._id} className="clickable" onClick={() => router.push(`/clients/${c._id}`)}>
                  <td>
                    <div className="person">
                      <span className="avatar-soft">{initialsOf(c.name).slice(0, 1)}</span>
                      {c.name}
                    </div>
                  </td>
                  <td className="muted">{c.email || c.phone || '—'}</td>
                  <td className="muted">{c.projectCount}</td>
                  <td className="muted">{naira(c.totalSpent)}</td>
                  <td><span className={`badge ${c.status || 'active'}`}>{statusLabel(c.status || 'active')}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="table-foot">
          <span>
            Showing {items.length} of {data?.total ?? 0} client{data?.total === 1 ? '' : 's'}
          </span>
          {pages > 1 && (
            <nav className="pagination" aria-label="Pagination">
              {page > 1 ? <Link href={href(page - 1)} aria-label="Previous page">‹</Link> : <span className="disabled">‹</span>}
              {Array.from({ length: pages }, (_, i) => i + 1).map((p) =>
                p === page ? (
                  <span key={p} className="current" aria-current="page">{p}</span>
                ) : (
                  <Link key={p} href={href(p)}>{p}</Link>
                )
              )}
              {page < pages ? <Link href={href(page + 1)} aria-label="Next page">›</Link> : <span className="disabled">›</span>}
            </nav>
          )}
        </div>
      </div>
    </>
  );
}

export default function ClientsPage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <ClientsList />
    </Suspense>
  );
}
