'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { useAuth } from '@/lib/auth-context';

interface LicenseStatus {
  blocked: boolean;
  message: string;
}

export function LicenseBanner() {
  const { user } = useAuth();
  const { data } = useQuery({
    queryKey: ['license'],
    queryFn: async () => (await api.get<LicenseStatus>('/license')).data,
    retry: false,
  });

  if (!data?.blocked) return null;

  return (
    <div className="flex items-center justify-between gap-3 bg-danger px-6 py-2.5 text-sm text-white">
      <span>{data.message}</span>
      {user?.role === 'ADMIN' ? (
        <Link href="/configuracoes/licenca" className="shrink-0 font-medium underline">
          Gerenciar licença
        </Link>
      ) : (
        <span className="shrink-0 text-white/80">Contate o administrador da conta.</span>
      )}
    </div>
  );
}
