'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { PortalHeader } from '@/components/portal-header';

const SUBPAGES = [
  { label: 'Meus dados', href: '/portal' },
  { label: 'Documentos', href: '/portal/documentos' },
  { label: 'Pendências', href: '/portal/pendencias' },
  { label: 'Férias', href: '/portal/ferias' },
  { label: 'Holerites', href: '/portal/holerites' },
  { label: 'Histórico', href: '/portal/historico' },
];

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? '';

  return (
    <>
      <PortalHeader title="Portal do Colaborador" />
      <div className="flex flex-wrap gap-2 border-b border-divider bg-page-bg px-8 py-4">
        {SUBPAGES.map((sp) => {
          const active = sp.href === '/portal' ? pathname === '/portal' : pathname.startsWith(sp.href);
          return (
            <Link
              key={sp.href}
              href={sp.href}
              className={`rounded-control border px-3 py-1.5 text-xs transition ${
                active
                  ? 'border-accent bg-accent text-on-accent font-medium'
                  : 'border-border-strong bg-surface text-text hover:border-accent'
              }`}
            >
              {sp.label}
            </Link>
          );
        })}
      </div>
      <main className="scroll-suave flex-1 overflow-y-auto px-8 py-6">{children}</main>
    </>
  );
}
