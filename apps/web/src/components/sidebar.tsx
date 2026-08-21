'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { useAuth } from '@/lib/auth-context';

interface NavItemDef {
  label: string;
  href: string;
  enabled: boolean;
}

/** Ordem por proximidade de uso: pessoal primeiro, depois módulos de gestão, sistema, e por último o portal de outra persona (colaborador sem papel de RH). Sem separador visual — só a ordem muda. */
const NAV_ITEMS: NavItemDef[] = [
  { label: 'Área de trabalho', href: '/painel', enabled: true },
  { label: 'Agenda', href: '/agenda', enabled: true },
  { label: 'Projetos', href: '/agenda/projetos', enabled: true },
  { label: 'Planner', href: '/planner', enabled: true },
  { label: 'Elô', href: '/elo', enabled: true },
  { label: 'Gestão de Pessoas', href: '/gestao-de-pessoas', enabled: true },
  { label: 'Departamento Pessoal', href: '/dp', enabled: true },
  { label: 'Saúde e Segurança do Trabalho', href: '/sst', enabled: true },
  { label: 'Compliance', href: '/compliance', enabled: true },
  { label: 'Psicologia', href: '/psicologia', enabled: false },
  { label: 'Indicadores', href: '/indicadores', enabled: true },
  { label: 'Aprovações', href: '/aprovacoes', enabled: true },
  { label: 'Ferramentas', href: '/ferramentas', enabled: true },
  { label: 'Configurações', href: '/configuracoes', enabled: true },
  { label: 'Portal do Colaborador', href: '/portal', enabled: true },
];

const TODOS_OS_HREFS = NAV_ITEMS.map((i) => i.href);

/** Marca ativo pelo href mais específico que casa com a rota atual — evita que "Agenda" (/agenda) e "Projetos" (/agenda/projetos) fiquem ativos ao mesmo tempo numa página de projeto. */
function isNavItemActive(pathname: string | null, href: string): boolean {
  if (!pathname) return false;
  if (pathname === href) return true;
  if (!pathname.startsWith(href + '/')) return false;
  return !TODOS_OS_HREFS.some((other) => other !== href && other.length > href.length && (pathname === other || pathname.startsWith(other + '/')));
}

interface Company {
  id: string;
  slug: string;
  name: string;
  nomeFantasia: string | null;
  logoUrl: string | null;
  current: boolean;
}

export function Sidebar() {
  const pathname = usePathname();
  const { tenant } = useAuth();
  const queryClient = useQueryClient();
  const [showSwitcher, setShowSwitcher] = useState(false);

  const nomeEmpresa = tenant?.nomeFantasia || tenant?.name;
  const inicialEmpresa = nomeEmpresa?.[0]?.toUpperCase();

  const { data: companies } = useQuery({
    queryKey: ['auth', 'companies'],
    queryFn: async () => (await api.get<Company[]>('/auth/companies')).data,
    enabled: showSwitcher,
  });

  const switchCompany = useMutation({
    mutationFn: async (slug: string) => api.post('/auth/switch-tenant', { tenantSlug: slug }),
    onSuccess: () => {
      queryClient.clear();
      // Troca de tenant muda todo o contexto (dados, permissões, tema da
      // empresa) — um reload completo evita qualquer tela ficar com dado
      // em cache da empresa anterior até o usuário atualizar manualmente.
      window.location.href = '/painel';
    },
  });

  return (
    <aside className="flex w-60 shrink-0 flex-col bg-accent py-6 text-on-accent">
      <div className="flex justify-center px-4 pb-4">
        <Image src="/logo-elos-cream.png" alt="elos" width={965} height={562} className="h-8 w-auto" />
      </div>

      <div className="scroll-suave flex min-h-0 flex-1 flex-col overflow-y-auto px-4">
        <nav className="flex flex-col gap-1">
          {NAV_ITEMS.map((item) => (
            <NavItem key={item.href} {...item} active={isNavItemActive(pathname, item.href)} />
          ))}
        </nav>
      </div>

      {nomeEmpresa && (
        <div className="relative px-4">
          <div className="mt-4 border-t border-on-accent/15" />
          <button
            type="button"
            onClick={() => setShowSwitcher((s) => !s)}
            className="flex w-full items-center gap-2.5 pt-4 text-left transition hover:opacity-80"
          >
            {tenant?.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={tenant.logoUrl} alt="" className="h-7 w-7 shrink-0 rounded-full object-cover" />
            ) : (
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/20 text-xs font-semibold text-on-accent">
                {inicialEmpresa}
              </span>
            )}
            <span className="min-w-0 flex-1 truncate text-sm font-medium text-on-accent">{nomeEmpresa}</span>
            <span className="text-on-accent/60">{showSwitcher ? '▾' : '▴'}</span>
          </button>

          {showSwitcher && (
            <div className="absolute bottom-full left-4 right-4 z-40 mb-2 rounded-container border border-border bg-surface text-text shadow-lg">
              <div className="scroll-suave max-h-64 overflow-y-auto py-1">
                {companies?.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => {
                      if (c.current) return;
                      switchCompany.mutate(c.slug);
                    }}
                    disabled={switchCompany.isPending}
                    className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm hover:bg-surface-alt disabled:cursor-default"
                  >
                    {c.logoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={c.logoUrl} alt="" className="h-6 w-6 shrink-0 rounded-full object-cover" />
                    ) : (
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-tint-blue text-[10px] font-semibold text-accent">
                        {(c.nomeFantasia || c.name)[0]?.toUpperCase()}
                      </span>
                    )}
                    <span className="min-w-0 flex-1 truncate">{c.nomeFantasia || c.name}</span>
                    {c.current && <span className="text-xs font-semibold text-accent">Atual</span>}
                  </button>
                ))}
                {companies?.length === 0 && <p className="px-3 py-2 text-xs text-text-tertiary">Nenhuma empresa encontrada.</p>}
              </div>
              <Link
                href="/configuracoes"
                onClick={() => setShowSwitcher(false)}
                className="block border-t border-divider px-3 py-2 text-sm text-accent hover:bg-surface-alt"
              >
                Ver perfil da empresa →
              </Link>
            </div>
          )}
        </div>
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
  const base = 'rounded-control px-3 py-2 text-sm transition';
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
