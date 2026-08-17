'use client';

import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, Card } from '@/components/ui';
import { api } from '@/lib/api-client';
import type { SwotPessoalRegistro } from './types';
import type { SecaoTema } from './theme';
import { SectionHeader } from './section-header';
import { localIso } from './lib';

const VAZIO = { forcas: '', fraquezas: '', oportunidades: '', ameacas: '' };

const QUADRANTES: { key: keyof typeof VAZIO; label: string; hint: string }[] = [
  { key: 'forcas', label: 'Forças', hint: 'O que você faz bem? Suas qualidades e recursos.' },
  { key: 'fraquezas', label: 'Fraquezas', hint: 'Onde você tem dificuldade ou precisa desenvolver?' },
  { key: 'oportunidades', label: 'Oportunidades', hint: 'O que ao seu redor pode te ajudar a crescer?' },
  { key: 'ameacas', label: 'Ameaças', hint: 'O que pode atrapalhar ou te colocar em risco?' },
];

export function SwotPessoalSection({ tema }: { tema: SecaoTema }) {
  const queryClient = useQueryClient();
  const [campos, setCampos] = useState(VAZIO);

  const { data: registros } = useQuery({
    queryKey: ['planner', 'swot-pessoal'],
    queryFn: async () => (await api.get<SwotPessoalRegistro[]>('/planner/swot-pessoal')).data,
  });

  const ultimo = registros?.[0];

  useEffect(() => {
    if (ultimo && ultimo.data.slice(0, 10) === localIso(new Date())) {
      setCampos({
        forcas: ultimo.forcas ?? '',
        fraquezas: ultimo.fraquezas ?? '',
        oportunidades: ultimo.oportunidades ?? '',
        ameacas: ultimo.ameacas ?? '',
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ultimo]);

  const salvar = useMutation({
    mutationFn: async () => api.put('/planner/swot-pessoal', { data: localIso(new Date()), ...campos }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['planner', 'swot-pessoal'] }),
  });

  return (
    <div className="flex max-w-3xl flex-col gap-5">
      <SectionHeader tema={tema} />

      <Card className="flex flex-col gap-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {QUADRANTES.map((q) => (
            <label key={q.key} className="flex flex-col gap-1.5 text-sm">
              <span className="font-medium text-text">{q.label}</span>
              <span className="text-xs text-text-tertiary">{q.hint}</span>
              <textarea
                value={campos[q.key]}
                onChange={(e) => setCampos((c) => ({ ...c, [q.key]: e.target.value }))}
                rows={4}
                className="rounded-[10px] border border-border-strong bg-surface px-3 py-2 text-sm"
              />
            </label>
          ))}
        </div>
        <Button type="button" onClick={() => salvar.mutate()} disabled={salvar.isPending} className="self-start">
          {salvar.isPending ? 'Salvando…' : 'Salvar'}
        </Button>
      </Card>

      {registros && registros.length > 1 && (
        <div className="flex flex-col gap-2">
          <span className="text-sm font-semibold text-text">Versões anteriores</span>
          {registros.slice(1).map((r) => (
            <Card key={r.id} className="py-3">
              <span className="text-xs text-text-tertiary">{new Date(r.data).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}</span>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
