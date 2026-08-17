'use client';

import { useState } from 'react';
import { Target, Flame, Wallet, Smile, HeartPulse, Ruler } from 'lucide-react';
import { Header } from '@/components/header';
import { cn } from '@/lib/cn';
import { MetasSection } from './metas';
import { HabitosSection } from './habitos';
import { FinancasSection } from './financas';
import { HumorSection } from './humor';
import { CicloSection } from './ciclo';
import { PesoMedidaSection } from './peso-medida';

type Secao = 'metas' | 'habitos' | 'financas' | 'humor' | 'ciclo' | 'peso';

const SECOES: { id: Secao; label: string; icon: typeof Target }[] = [
  { id: 'metas', label: 'Metas', icon: Target },
  { id: 'habitos', label: 'Hábitos', icon: Flame },
  { id: 'financas', label: 'Finanças', icon: Wallet },
  { id: 'humor', label: 'Humor', icon: Smile },
  { id: 'ciclo', label: 'Ciclo', icon: HeartPulse },
  { id: 'peso', label: 'Peso e medidas', icon: Ruler },
];

export default function PlannerPage() {
  const [secao, setSecao] = useState<Secao>('metas');
  const ano = new Date().getFullYear();

  return (
    <>
      <Header eyebrow={`Seu ano de ${ano}`} title="Planner Pessoal" />
      <div className="flex flex-1 flex-col overflow-hidden md:flex-row">
        <nav className="flex shrink-0 gap-1 overflow-x-auto border-b border-divider bg-page-bg px-4 py-3 md:w-56 md:flex-col md:overflow-visible md:border-b-0 md:border-r md:px-3 md:py-4">
          {SECOES.map((s) => {
            const Icon = s.icon;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => setSecao(s.id)}
                className={cn(
                  'flex shrink-0 items-center gap-2 rounded-[10px] px-3 py-2 text-sm transition',
                  secao === s.id ? 'bg-accent text-on-accent font-medium' : 'text-text-secondary hover:bg-surface-alt',
                )}
              >
                <Icon className="h-4 w-4" />
                {s.label}
              </button>
            );
          })}
        </nav>

        <main className="flex-1 overflow-y-auto px-4 py-6 sm:px-8">
          {secao === 'metas' && <MetasSection ano={ano} />}
          {secao === 'habitos' && <HabitosSection ano={ano} />}
          {secao === 'financas' && <FinancasSection ano={ano} />}
          {secao === 'humor' && <HumorSection ano={ano} />}
          {secao === 'ciclo' && <CicloSection />}
          {secao === 'peso' && <PesoMedidaSection ano={ano} />}
        </main>
      </div>
    </>
  );
}
