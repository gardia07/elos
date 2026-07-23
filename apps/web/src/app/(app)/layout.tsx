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
    <div className="flex min-h-screen bg-page-bg">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <LicenseBanner />
        {children}
      </div>
    </div>
  );
}
