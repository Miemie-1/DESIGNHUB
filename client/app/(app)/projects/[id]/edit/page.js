'use client';

import { Suspense, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import ProjectForm from '@/components/ProjectForm';
import { api } from '@/lib/api';
import { PageLoading } from '@/components/Loading';

export default function EditProjectPage() {
  const { id } = useParams();
  const [project, setProject] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api(`/projects/${id}`).then(setProject).catch((e) => setError(e.message));
  }, [id]);

  if (error) return <div className="error">{error}</div>;
  if (!project) return <PageLoading />;

  return (
    <Suspense fallback={<PageLoading />}>
      <ProjectForm
        initial={project}
        submitLabel="Update Project"
        onSubmit={(body) => api(`/projects/${id}`, { method: 'PUT', body })}
        onDelete={() => api(`/projects/${id}`, { method: 'DELETE' })}
      />
    </Suspense>
  );
}
