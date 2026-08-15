'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

/** A Agenda Geral virou a visão "Lista" do módulo de Agenda completo (/agenda) — mantido como redirect para não quebrar links salvos. */
export default function AgendaGeralRedirectPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const data = searchParams.get('data');
    router.replace(data ? `/agenda?view=dia&data=${data}` : '/agenda?view=lista');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <p className="p-8 text-sm text-text-tertiary">Redirecionando para a nova Agenda…</p>;
}
