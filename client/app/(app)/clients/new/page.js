'use client';

import ClientForm from '@/components/ClientForm';
import { api } from '@/lib/api';

export default function NewClientPage() {
  return <ClientForm onSubmit={(body) => api('/clients', { method: 'POST', body })} />;
}
