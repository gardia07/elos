'use client';

import { useState } from 'react';
import { Header } from '@/components/header';
import { cn } from '@/lib/cn';
import { SECOES, type SecaoId } from './theme';
import { MetasSection } from './metas';
import { HabitosSection } from './habitos';
import { FinancasSection } from './financas';
import { HumorSection } from './humor';
import { CicloSection } from './ciclo';
import { PesoMedidaSection } from './peso-medida';

export default function PlannerPage() {
  const [secaoId, setSecaoId] = useState<SecaoId>('metas');
  const ano = new Date().getFullYear();
  const tema = SECOES.find((s) => s.id === secaoId)!;

  return (
    <>
      <Header eyebrow={`Seu ano de ${ano}`} title="Planner Pessoal" />
      <div className="flex flex-1 flex-col overflow-hidden md:flex-row">
        <nav className="flex shrink-0 gap-1 overflow-x-auto border-b border-divider bg-page-bg px-4 py-3 md:w-56 md:flex-col md:overflow-visible md:border-b-0 md:border-r md:px-3 md:py-4">
          {SECOES.map((s) => {
            const Icon = s.icon;
            const active = secaoId === s.id;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => setSecaoId(s.id)}
                className={cn('flex shrink-0 items-center gap-2 rounded-[10px] px-3 py-2 text-sm font-medium transition', !active && 'text-text-secondary hover:bg-surface-alt')}
                style={active ? { backgroundColor: `${s.cor}25`, color: s.cor } : undefined}
              >
                <Icon className="h-4 w-4" style={active ? { color: s.cor } : undefined} />
                {s.label}
              </button>
            );
          })}
        </nav>

        <main className="flex-1 overflow-y-auto px-4 py-6 sm:px-8">
          {secaoId === 'metas' && <MetasSection ano={ano} tema={tema} />}
          {secaoId === 'habitos' && <HabitosSection ano={ano} tema={tema} />}
          {secaoId === 'financas' && <FinancasSection ano={ano} tema={tema} />}
          {secaoId === 'humor' && <HumorSection ano={ano} tema={tema} />}
          {secaoId === 'ciclo' && <CicloSection tema={tema} />}
          {secaoId === 'peso' && <PesoMedidaSection ano={ano} tema={tema} />}
        </main>
      </div>
    </>
  );
}
