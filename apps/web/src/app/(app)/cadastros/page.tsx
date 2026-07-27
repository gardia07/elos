'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function CadastrosPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/configuracoes/cadastros');
  }, [router]);
  return null;
}
