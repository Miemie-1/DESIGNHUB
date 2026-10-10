'use client';

import { Suspense } from 'react';
import ProjectForm from '@/components/ProjectForm';
import { api } from '@/lib/api';
import { PageLoading } from '@/components/Loading';

export default function NewProjectPage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <ProjectForm onSubmit={(body) => api('/projects', { method: 'POST', body })} />
    </Suspense>
  );
}
