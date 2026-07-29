'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { PriorityAlerts, type PriorityAlert } from '@/components/priority-alerts';

interface TerminationAlert {
  hub: string;
  mensagem: string;
  alertKey: string;
  prioridade: 'BAIXA' | 'MEDIA' | 'ALTA' | 'CRITICA';
  href: string;
}

const PRIORIDADE_SEVERIDADE = { CRITICA: 'alta', ALTA: 'alta', MEDIA: 'media', BAIXA: 'baixa' } as const;
const PRIORIDADE_PESO = { CRITICA: 3, ALTA: 2, MEDIA: 1, BAIXA: 0 } as const;

export default function PrazosDesligamentoPage() {
  const { data: lembretes } = useQuery({
    queryKey: ['rh', 'terminations', 'lembretes'],
    queryFn: async () => (await api.get<TerminationAlert[]>('/rh/terminations/lembretes')).data,
  });

  const alertas: PriorityAlert[] = (lembretes ?? [])
    .slice()
    .sort((a, b) => PRIORIDADE_PESO[b.prioridade] - PRIORIDADE_PESO[a.prioridade])
    .map((l) => ({ id: l.alertKey, categoria: l.hub, mensagem: l.mensagem, severidade: PRIORIDADE_SEVERIDADE[l.prioridade], href: l.href }));

  return (
    <div className="flex max-w-2xl flex-col gap-4">
      <Link href="/gestao-de-pessoas/desligamento" className="text-sm text-text-secondary hover:text-text">
        ← Voltar para Desligamento
      </Link>
      <h2 className="text-lg font-semibold">Prazos em aberto</h2>
      <p className="text-sm text-text-secondary">
        eSocial, pagamento de verbas rescisórias, homologação e exame demissional dos desligamentos em andamento —
        recalculado sempre que a página carrega, some sozinho quando a pendência é resolvida.
      </p>
      <PriorityAlerts alertas={alertas} />
    </div>
  );
}
