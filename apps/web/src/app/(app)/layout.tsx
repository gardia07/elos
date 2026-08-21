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
    if (isLoading) return;
    if (!user) {
      router.replace('/login');
      return;
    }
    // Colaborador não tem acesso ao hub interno (dado de toda a empresa) --
    // só ao próprio Portal. Ver PortalController/ColaboradorScopeGuard no
    // backend: essa restrição também é aplicada na API, isto aqui é só a
    // navegação -- não é a única barreira.
    if (user.role === 'COLABORADOR') router.replace('/portal');
  }, [isLoading, user, router]);

  if (isLoading || !user || user.role === 'COLABORADOR') {
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
