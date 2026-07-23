'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Header } from '@/components/header';

const SUBPAGES = [
  { label: 'Meus dados', href: '/portal' },
  { label: 'Documentos', href: '/portal/documentos' },
  { label: 'Férias', href: '/portal/ferias' },
  { label: 'Holerites', href: '/portal/holerites' },
  { label: 'Histórico', href: '/portal/historico' },
];

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? '';

  return (
    <>
      <Header eyebrow="Autoatendimento" title="Portal do Colaborador" />
      <div className="flex flex-wrap gap-2 border-b border-divider bg-page-bg px-8 py-4">
        {SUBPAGES.map((sp) => {
          const active = sp.href === '/portal' ? pathname === '/portal' : pathname.startsWith(sp.href);
          return (
            <Link
              key={sp.href}
              href={sp.href}
              className={`rounded-full border px-4 py-2 text-sm transition ${
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
      <main className="flex-1 overflow-y-auto px-8 py-6">{children}</main>
    </>
  );
}
