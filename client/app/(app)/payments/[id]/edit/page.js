'use client';

import { Suspense, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import PaymentForm from '@/components/PaymentForm';
import { api } from '@/lib/api';
import { PageLoading } from '@/components/Loading';

export default function EditPaymentPage() {
  const { id } = useParams();
  const [payment, setPayment] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api(`/payments/${id}`).then(setPayment).catch((e) => setError(e.message));
  }, [id]);

  if (error) return <div className="error">{error}</div>;
  if (!payment) return <PageLoading />;

  return (
    <Suspense fallback={<PageLoading />}>
      <PaymentForm
        initial={payment}
        submitLabel="Update Payment"
        onSubmit={(body) => api(`/payments/${id}`, { method: 'PUT', body })}
        onDelete={() => api(`/payments/${id}`, { method: 'DELETE' })}
      />
    </Suspense>
  );
}
