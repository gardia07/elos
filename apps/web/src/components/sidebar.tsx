'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const HUBS = [
  { label: 'Área de trabalho', href: '/painel', enabled: true },
  { label: 'Gestão de Pessoas', href: '/gestao-de-pessoas', enabled: true },
  { label: 'DP', href: '/dp', enabled: true },
  { label: 'SST', href: '/sst', enabled: true },
  { label: 'Compliance', href: '/compliance', enabled: true },
  { label: 'Psicologia', href: '/psicologia', enabled: false },
  { label: 'Indicadores', href: '/indicadores', enabled: true },
];

const FERRAMENTAS = [
  { label: 'Cadastros', href: '/cadastros', enabled: true },
  { label: 'Aprovações', href: '/aprovacoes', enabled: true },
  { label: 'Ferramentas', href: '/ferramentas', enabled: true },
  { label: 'Configurações', href: '/configuracoes', enabled: true },
];

const OUTROS = [
  { label: 'Elô', href: '/elo', enabled: true },
  { label: 'Portal do Colaborador', href: '/portal', enabled: true },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex w-60 shrink-0 flex-col gap-6 bg-accent px-4 py-6 text-on-accent">
      <div className="px-2">
        <Image src="/logo-elos-cream.png" alt="elos" width={965} height={562} className="h-8 w-auto" />
      </div>

      <nav className="flex flex-col gap-1">
        {HUBS.map((hub) => (
          <NavItem key={hub.href} {...hub} active={pathname?.startsWith(hub.href)} />
        ))}
      </nav>

      <div>
        <div className="px-3 pb-2 text-[10.5px] font-semibold uppercase tracking-[0.06em] text-on-accent/60">
          Ferramentas
        </div>
        <nav className="flex flex-col gap-1">
          {FERRAMENTAS.map((item) => (
            <NavItem key={item.href} {...item} active={pathname?.startsWith(item.href)} />
          ))}
        </nav>
      </div>

      <div>
        <nav className="flex flex-col gap-1">
          {OUTROS.map((item) => (
            <NavItem key={item.href} {...item} active={pathname === item.href || pathname?.startsWith(item.href + '/')} />
          ))}
        </nav>
      </div>
    </aside>
  );
}

function NavItem({
  label,
  href,
  enabled,
  active,
}: {
  label: string;
  href: string;
  enabled: boolean;
  active?: boolean;
}) {
  const base = 'rounded-[10px] px-3 py-2 text-sm transition';
  if (!enabled) {
    return (
      <span className={`${base} cursor-not-allowed text-on-accent/40`} title="Em breve">
        {label}
      </span>
    );
  }
  return (
    <Link
      href={href}
      className={`${base} ${active ? 'bg-white/20 font-medium' : 'text-on-accent/85 hover:bg-white/10'}`}
    >
      {label}
    </Link>
  );
}
