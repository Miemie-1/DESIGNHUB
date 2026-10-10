import { Suspense } from 'react';
import AppShell from '@/components/AppShell';

// The shell reads the current path/session on the client, so it streams in behind Suspense.
export default function AppLayout({ children }) {
  return (
    <Suspense fallback={null}>
      <AppShell>{children}</AppShell>
    </Suspense>
  );
}
