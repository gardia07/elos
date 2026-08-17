'use client';

import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { api } from '@/lib/api-client';
import { Button, Card } from '@/components/ui';
import type { RevisaoMensal } from './types';
import type { SecaoTema } from './theme';
import { SectionHeader } from './section-header';
import { MESES } from './lib';

const VAZIO = { desejo: '', resultado: '', obstaculo: '', plano: '', conquistas: '', oQueNaoFuncionou: '', proximoPasso: '' };

export function RevisaoMensalSection({ ano, tema }: { ano: number; tema: SecaoTema }) {
  const queryClient = useQueryClient();
  const [mes, setMes] = useState(new Date().getMonth());
  const [campos, setCampos] = useState(VAZIO);
  const [satisfacao, setSatisfacao] = useState(5);

  const { data: revisoes } = useQuery({
    queryKey: ['planner', 'revisao-mensal', ano],
    queryFn: async () => (await api.get<RevisaoMensal[]>('/planner/revisao-mensal', { params: { ano } })).data,
  });

  const revisaoDoMes = revisoes?.find((r) => r.mes === mes + 1);

  useEffect(() => {
    setCampos({
      desejo: revisaoDoMes?.desejo ?? '',
      resultado: revisaoDoMes?.resultado ?? '',
      obstaculo: revisaoDoMes?.obstaculo ?? '',
      plano: revisaoDoMes?.plano ?? '',
      conquistas: revisaoDoMes?.conquistas ?? '',
      oQueNaoFuncionou: revisaoDoMes?.oQueNaoFuncionou ?? '',
      proximoPasso: revisaoDoMes?.proximoPasso ?? '',
    });
    setSatisfacao(revisaoDoMes?.satisfacao ?? 5);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mes, revisoes]);

  const salvar = useMutation({
    mutationFn: async () => api.put('/planner/revisao-mensal', { ano, mes: mes + 1, ...campos, satisfacao }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['planner', 'revisao-mensal', ano] }),
  });

  const set = (campo: keyof typeof VAZIO) => (e: React.ChangeEvent<HTMLTextAreaElement | HTMLInputElement>) =>
    setCampos((c) => ({ ...c, [campo]: e.target.value }));

  return (
    <div className="flex max-w-2xl flex-col gap-5">
      <SectionHeader tema={tema} />

      <div className="flex items-center justify-center gap-3">
        <button type="button" onClick={() => setMes((m) => Math.max(0, m - 1))} disabled={mes === 0} className="text-text-secondary disabled:opacity-30">
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="text-sm font-medium text-text">
          {MESES[mes]} de {ano}
        </span>
        <button type="button" onClick={() => setMes((m) => Math.min(11, m + 1))} disabled={mes === 11} className="text-text-secondary disabled:opacity-30">
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      <Card className="flex flex-col gap-3">
        <div>
          <span className="text-sm font-semibold" style={{ color: tema.cor }}>
            Início do mês — método WOOP
          </span>
          <p className="text-xs text-text-tertiary">Desejo, resultado, obstáculo e plano.</p>
        </div>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="text-text-secondary">Desejo — o que você quer alcançar esse mês?</span>
          <textarea
            value={campos.desejo}
            onChange={set('desejo')}
            rows={2}
            placeholder="Um objetivo desafiador, mas alcançável…"
            className="rounded-[10px] border border-border-strong bg-surface px-3 py-2 text-sm"
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="text-text-secondary">Resultado — como seria alcançar isso? (imagine com detalhe)</span>
          <textarea
            value={campos.resultado}
            onChange={set('resultado')}
            rows={2}
            className="rounded-[10px] border border-border-strong bg-surface px-3 py-2 text-sm"
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="text-text-secondary">Obstáculo — o que dentro de você mais provavelmente vai atrapalhar?</span>
          <textarea
            value={campos.obstaculo}
            onChange={set('obstaculo')}
            rows={2}
            placeholder="Ex.: procrastinação, cansaço no fim do dia, ansiedade…"
            className="rounded-[10px] border border-border-strong bg-surface px-3 py-2 text-sm"
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="text-text-secondary">Plano — se esse obstáculo aparecer, o que você vai fazer?</span>
          <textarea
            value={campos.plano}
            onChange={set('plano')}
            rows={2}
            placeholder="Se [obstáculo] acontecer, então eu vou…"
            className="rounded-[10px] border border-border-strong bg-surface px-3 py-2 text-sm"
          />
        </label>
      </Card>

      <Card className="flex flex-col gap-3">
        <div>
          <span className="text-sm font-semibold" style={{ color: tema.cor }}>
            Fim do mês — reflexão guiada
          </span>
          <p className="text-xs text-text-tertiary">Sem autojulgamento — o objetivo é aprender, não se cobrar.</p>
        </div>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="flex items-center justify-between text-text-secondary">
            Como você avalia esse mês?
            <span className="font-semibold text-text">{satisfacao}</span>
          </span>
          <input type="range" min={1} max={10} value={satisfacao} onChange={(e) => setSatisfacao(Number(e.target.value))} style={{ accentColor: tema.cor }} />
        </label>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="text-text-secondary">Conquistas — do que você se orgulha, por menor que seja?</span>
          <textarea
            value={campos.conquistas}
            onChange={set('conquistas')}
            rows={2}
            className="rounded-[10px] border border-border-strong bg-surface px-3 py-2 text-sm"
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="text-text-secondary">O que não funcionou? (é dado, não defeito)</span>
          <textarea
            value={campos.oQueNaoFuncionou}
            onChange={set('oQueNaoFuncionou')}
            rows={2}
            className="rounded-[10px] border border-border-strong bg-surface px-3 py-2 text-sm"
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="text-text-secondary">Uma única coisa pra levar pro próximo mês</span>
          <input
            value={campos.proximoPasso}
            onChange={set('proximoPasso')}
            placeholder="Só uma — foco em uma coisa é mais eficaz que uma lista grande…"
            className="rounded-[10px] border border-border-strong bg-surface px-3 py-2 text-sm"
          />
        </label>
      </Card>

      <Button type="button" onClick={() => salvar.mutate()} disabled={salvar.isPending} className="self-start">
        {salvar.isPending ? 'Salvando…' : 'Salvar'}
      </Button>
    </div>
  );
}
