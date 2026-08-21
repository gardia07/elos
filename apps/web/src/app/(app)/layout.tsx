'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { Sidebar } from '@/components/sidebar';
import { LicenseBanner } from '@/components/license-banner';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !user) router.replace('/login');
  }, [isLoading, user, router]);

  if (isLoading || !user) {
    return <div className="flex min-h-screen items-center justify-center text-text-secondary">Carregando…</div>;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-page-bg">
      <Sidebar />
      <div className="scroll-suave flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto">
        <LicenseBanner />
        {children}
      </div>
    </div>
  );
}
