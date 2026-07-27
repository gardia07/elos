'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';

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
  const { tenant } = useAuth();

  const nomeEmpresa = tenant?.nomeFantasia || tenant?.name;
  const inicialEmpresa = nomeEmpresa?.[0]?.toUpperCase();

  return (
    <aside className="flex w-60 shrink-0 flex-col bg-accent py-6 text-on-accent">
      <div className="flex justify-center px-4 pb-4">
        <Image src="/logo-elos-cream.png" alt="elos" width={965} height={562} className="h-8 w-auto" />
      </div>

      <div className="flex flex-1 flex-col gap-6 px-4">
      <nav className="flex flex-col gap-1">
        {HUBS.map((hub) => (
          <NavItem key={hub.href} {...hub} active={pathname?.startsWith(hub.href)} />
        ))}
      </nav>

      <div>
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
      </div>

      {nomeEmpresa && (
        <>
          <div className="mt-4 border-t border-on-accent/15" />
          <Link
            href="/configuracoes"
            className="flex items-center gap-2.5 px-4 pt-4 transition hover:opacity-80"
          >
            {tenant?.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={tenant.logoUrl} alt="" className="h-7 w-7 shrink-0 rounded-full object-cover" />
            ) : (
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/20 text-xs font-semibold text-on-accent">
                {inicialEmpresa}
              </span>
            )}
            <span className="truncate text-sm font-medium text-on-accent">{nomeEmpresa}</span>
          </Link>
        </>
      )}
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
