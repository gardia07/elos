'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function FerramentasIndex() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/ferramentas/agenda');
  }, [router]);
  return null;
}
