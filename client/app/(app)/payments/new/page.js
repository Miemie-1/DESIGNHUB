'use client';

import { Suspense } from 'react';
import PaymentForm from '@/components/PaymentForm';
import { api } from '@/lib/api';
import { PageLoading } from '@/components/Loading';

export default function NewPaymentPage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <PaymentForm onSubmit={(body) => api('/payments', { method: 'POST', body })} />
    </Suspense>
  );
}
