// Skeleton placeholders shown while data loads (replaces plain "Loading…" text).

export function PageLoading() {
  return (
    <div className="skeleton-stack" aria-busy="true" aria-label="Loading">
      <span className="skeleton title" />
      <span className="skeleton block" />
      <span className="skeleton block" />
    </div>
  );
}

// A few shimmering lines, for use inside a table cell.
export function RowsLoading({ colSpan, rows = 4 }) {
  return Array.from({ length: rows }, (_, i) => (
    <tr key={i} aria-hidden="true">
      <td colSpan={colSpan}><span className="skeleton" style={{ width: `${88 - i * 9}%` }} /></td>
    </tr>
  ));
}
