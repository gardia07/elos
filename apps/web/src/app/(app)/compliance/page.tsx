'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function ComplianceIndex() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/compliance/visao-geral');
  }, [router]);
  return null;
}
