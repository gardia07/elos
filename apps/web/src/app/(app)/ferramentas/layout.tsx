'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Header } from '@/components/header';

const SUBPAGES = [
  { label: 'Catálogo', href: '/ferramentas/catalogo' },
  { label: 'Documentos', href: '/ferramentas/documentos' },
  { label: 'Relatórios', href: '/ferramentas/relatorios' },
  { label: 'Comunicação', href: '/ferramentas/comunicacao' },
  { label: 'Integrações', href: '/ferramentas/integracoes' },
];

export default function FerramentasLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? '';

  return (
    <>
      <Header eyebrow="Ferramentas" title="Ferramentas" />
      <div className="flex flex-wrap gap-2 border-b border-divider bg-page-bg px-8 py-4">
        {SUBPAGES.map((sp) => {
          const active = pathname.startsWith(sp.href);
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
