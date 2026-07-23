'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function SstIndex() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/sst/visao-geral');
  }, [router]);
  return null;
}
