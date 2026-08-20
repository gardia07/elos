'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { Header } from '@/components/header';

const SUBPAGES = [
  { label: 'Painel', href: '/gestao-de-pessoas/painel' },
  { label: 'Recrutamento & Seleção', href: '/gestao-de-pessoas/recrutamento' },
  { label: 'Admissão', href: '/gestao-de-pessoas/admissao' },
  { label: 'Colaboradores', href: '/gestao-de-pessoas/colaboradores' },
  { label: 'Avaliação e PDI', href: '/gestao-de-pessoas/avaliacao' },
  { label: 'Férias', href: '/gestao-de-pessoas/ferias' },
  { label: 'Desligamento', href: '/gestao-de-pessoas/desligamento' },
];

export default function GestaoDePessoasLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? '';
  const colaboradorId = pathname.match(/^\/gestao-de-pessoas\/colaboradores\/([^/]+)$/)?.[1];

  // mesma queryKey usada pela própria página do colaborador -- reaproveita o cache
  // em vez de disparar uma segunda requisição, só pra saber de quem é a ficha aberta.
  const { data: colaborador } = useQuery({
    queryKey: ['employee', colaboradorId],
    queryFn: async () => (await api.get<{ nome: string }>(`/rh/employees/${colaboradorId}`)).data,
    enabled: !!colaboradorId,
  });

  const eyebrow = colaborador ? `Recrutamento · Admissão · Colaboradores · ${colaborador.nome}` : 'Recrutamento · Admissão · Colaboradores';

  return (
    <>
      <Header eyebrow={eyebrow} title="Gestão de Pessoas" />
      <div className="flex flex-wrap gap-2 border-b border-divider bg-page-bg px-8 py-4">
        {SUBPAGES.map((sp) => {
          const active = pathname.startsWith(sp.href);
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
