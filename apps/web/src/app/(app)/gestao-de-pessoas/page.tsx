'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function GestaoDePessoasIndex() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/gestao-de-pessoas/painel');
  }, [router]);
  return null;
}
