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

export function RevisaoMensalSection({ ano, tema }: { ano: number; tema: SecaoTema }) {
  const queryClient = useQueryClient();
  const [mes, setMes] = useState(new Date().getMonth());
  const [intencoes, setIntencoes] = useState('');
  const [oQueFuncionou, setOQueFuncionou] = useState('');
  const [oQueNaoFuncionou, setOQueNaoFuncionou] = useState('');
  const [oQuePrecisaMudar, setOQuePrecisaMudar] = useState('');

  const { data: revisoes } = useQuery({
    queryKey: ['planner', 'revisao-mensal', ano],
    queryFn: async () => (await api.get<RevisaoMensal[]>('/planner/revisao-mensal', { params: { ano } })).data,
  });

  const revisaoDoMes = revisoes?.find((r) => r.mes === mes + 1);

  useEffect(() => {
    setIntencoes(revisaoDoMes?.intencoes ?? '');
    setOQueFuncionou(revisaoDoMes?.oQueFuncionou ?? '');
    setOQueNaoFuncionou(revisaoDoMes?.oQueNaoFuncionou ?? '');
    setOQuePrecisaMudar(revisaoDoMes?.oQuePrecisaMudar ?? '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mes, revisoes]);

  const salvar = useMutation({
    mutationFn: async () =>
      api.put('/planner/revisao-mensal', { ano, mes: mes + 1, intencoes, oQueFuncionou, oQueNaoFuncionou, oQuePrecisaMudar }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['planner', 'revisao-mensal', ano] }),
  });

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

      <Card className="flex flex-col gap-2">
        <span className="text-sm font-semibold" style={{ color: tema.cor }}>
          Intenções pra {MESES[mes].toLowerCase()}
        </span>
        <p className="text-xs text-text-tertiary">O que você quer priorizar ou conquistar esse mês?</p>
        <textarea
          value={intencoes}
          onChange={(e) => setIntencoes(e.target.value)}
          rows={4}
          placeholder="Ex.: focar em terminar o curso, cuidar mais do sono, retomar a academia…"
          className="rounded-[10px] border border-border-strong bg-surface px-3 py-2 text-sm"
        />
      </Card>

      <Card className="flex flex-col gap-3">
        <span className="text-sm font-semibold" style={{ color: tema.cor }}>
          Reflexão de fim de mês
        </span>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="text-text-secondary">O que funcionou?</span>
          <textarea
            value={oQueFuncionou}
            onChange={(e) => setOQueFuncionou(e.target.value)}
            rows={2}
            className="rounded-[10px] border border-border-strong bg-surface px-3 py-2 text-sm"
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="text-text-secondary">O que não funcionou?</span>
          <textarea
            value={oQueNaoFuncionou}
            onChange={(e) => setOQueNaoFuncionou(e.target.value)}
            rows={2}
            className="rounded-[10px] border border-border-strong bg-surface px-3 py-2 text-sm"
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="text-text-secondary">O que precisa mudar?</span>
          <textarea
            value={oQuePrecisaMudar}
            onChange={(e) => setOQuePrecisaMudar(e.target.value)}
            rows={2}
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
