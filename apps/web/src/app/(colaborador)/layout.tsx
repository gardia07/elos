'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';

/**
 * Casca própria do Portal do Colaborador -- deliberadamente sem <Sidebar />
 * (navegação do hub interno) nem <LicenseBanner /> (gestão de conta é
 * assunto de quem administra a empresa, não do colaborador). Qualquer
 * usuário autenticado pode entrar aqui (inclusive RH/gestor acessando o
 * próprio autoatendimento) -- é o hub interno que fica restrito a quem não
 * tem o papel COLABORADOR, não o contrário.
 */
export default function ColaboradorLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !user) router.replace('/login');
  }, [isLoading, user, router]);

  if (isLoading || !user) {
    return <div className="flex min-h-screen items-center justify-center text-text-secondary">Carregando…</div>;
  }

  return <div className="flex h-screen flex-col overflow-hidden bg-page-bg">{children}</div>;
}
