'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import ClientForm from '@/components/ClientForm';
import { api } from '@/lib/api';
import { PageLoading } from '@/components/Loading';

export default function EditClientPage() {
  const { id } = useParams();
  const [client, setClient] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api(`/clients/${id}`).then(setClient).catch((e) => setError(e.message));
  }, [id]);

  if (error) return <div className="error">{error}</div>;
  if (!client) return <PageLoading />;

  return (
    <ClientForm
      initial={client}
      submitLabel="Update Client"
      onSubmit={(body) => api(`/clients/${id}`, { method: 'PUT', body })}
      onDelete={() => api(`/clients/${id}`, { method: 'DELETE' })}
    />
  );
}
