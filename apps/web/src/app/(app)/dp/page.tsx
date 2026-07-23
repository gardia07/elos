'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function DpIndex() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/dp/prazos');
  }, [router]);
  return null;
}
