'use client';

import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, Card } from '@/components/ui';
import { api } from '@/lib/api-client';
import type { IkigaiAvaliacao } from './types';
import type { SecaoTema } from './theme';
import { SectionHeader } from './section-header';
import { localIso } from './lib';

const VAZIO = { oQueAma: '', noQueEBom: '', oMundoPrecisa: '', peloQuePodeSerPago: '', sintese: '' };

export function IkigaiSection({ tema }: { tema: SecaoTema }) {
  const queryClient = useQueryClient();
  const [campos, setCampos] = useState(VAZIO);

  const { data: avaliacoes } = useQuery({
    queryKey: ['planner', 'ikigai'],
    queryFn: async () => (await api.get<IkigaiAvaliacao[]>('/planner/ikigai')).data,
  });

  const ultima = avaliacoes?.[0];

  useEffect(() => {
    if (ultima && ultima.data.slice(0, 10) === localIso(new Date())) {
      setCampos({
        oQueAma: ultima.oQueAma ?? '',
        noQueEBom: ultima.noQueEBom ?? '',
        oMundoPrecisa: ultima.oMundoPrecisa ?? '',
        peloQuePodeSerPago: ultima.peloQuePodeSerPago ?? '',
        sintese: ultima.sintese ?? '',
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ultima]);

  const salvar = useMutation({
    mutationFn: async () => api.put('/planner/ikigai', { data: localIso(new Date()), ...campos }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['planner', 'ikigai'] }),
  });

  const set = (campo: keyof typeof VAZIO) => (e: React.ChangeEvent<HTMLTextAreaElement>) => setCampos((c) => ({ ...c, [campo]: e.target.value }));

  return (
    <div className="flex max-w-2xl flex-col gap-5">
      <SectionHeader tema={tema} />

      <Card className="flex flex-col gap-4">
        <p className="text-xs text-text-tertiary">
          Seu ikigai é a interseção dessas 4 respostas — não precisa preencher tudo de uma vez, volte quando quiser refinar.
        </p>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="text-text-secondary">O que você ama fazer?</span>
          <textarea value={campos.oQueAma} onChange={set('oQueAma')} rows={2} className="rounded-[10px] border border-border-strong bg-surface px-3 py-2 text-sm" />
        </label>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="text-text-secondary">No que você é bom?</span>
          <textarea value={campos.noQueEBom} onChange={set('noQueEBom')} rows={2} className="rounded-[10px] border border-border-strong bg-surface px-3 py-2 text-sm" />
        </label>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="text-text-secondary">Do que o mundo (ou as pessoas ao seu redor) precisa?</span>
          <textarea value={campos.oMundoPrecisa} onChange={set('oMundoPrecisa')} rows={2} className="rounded-[10px] border border-border-strong bg-surface px-3 py-2 text-sm" />
        </label>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="text-text-secondary">Pelo que você pode ser pago ou reconhecido?</span>
          <textarea value={campos.peloQuePodeSerPago} onChange={set('peloQuePodeSerPago')} rows={2} className="rounded-[10px] border border-border-strong bg-surface px-3 py-2 text-sm" />
        </label>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="text-text-secondary">Juntando tudo — qual sua síntese hoje?</span>
          <textarea
            value={campos.sintese}
            onChange={set('sintese')}
            rows={2}
            placeholder="Meu ikigai é…"
            className="rounded-[10px] border border-border-strong bg-surface px-3 py-2 text-sm"
          />
        </label>
        <Button type="button" onClick={() => salvar.mutate()} disabled={salvar.isPending} className="self-start">
          {salvar.isPending ? 'Salvando…' : 'Salvar'}
        </Button>
      </Card>

      {avaliacoes && avaliacoes.length > 1 && (
        <div className="flex flex-col gap-2">
          <span className="text-sm font-semibold text-text">Versões anteriores</span>
          {avaliacoes.slice(1).map((a) => (
            <Card key={a.id} className="flex flex-col gap-1">
              <span className="text-xs text-text-tertiary">{new Date(a.data).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}</span>
              {a.sintese && <p className="text-sm text-text-secondary">{a.sintese}</p>}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
