'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { Button, Card } from '@/components/ui';
import type { MelhorEuPossivelRegistro } from './types';
import type { SecaoTema } from './theme';
import { SectionHeader } from './section-header';
import { localIso } from './lib';

export function MelhorEuPossivelSection({ tema }: { tema: SecaoTema }) {
  const queryClient = useQueryClient();
  const [texto, setTexto] = useState('');

  const { data: registros } = useQuery({
    queryKey: ['planner', 'melhor-eu-possivel'],
    queryFn: async () => (await api.get<MelhorEuPossivelRegistro[]>('/planner/melhor-eu-possivel')).data,
  });

  const salvar = useMutation({
    mutationFn: async () => api.put('/planner/melhor-eu-possivel', { data: localIso(new Date()), texto }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['planner', 'melhor-eu-possivel'] });
      setTexto('');
    },
  });

  return (
    <div className="flex max-w-2xl flex-col gap-5">
      <SectionHeader tema={tema} />

      <Card className="flex flex-col gap-3">
        <p className="text-xs text-text-tertiary">
          Imagine daqui a alguns anos, tudo correu da melhor forma possível — você alcançou o que queria. Como é essa vida? O que você faz, sente,
          conquistou? Escreva com o máximo de detalhe que conseguir.
        </p>
        <textarea
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          rows={8}
          placeholder="Daqui a alguns anos, eu…"
          className="rounded-control border border-border-strong bg-surface px-3 py-2 text-sm"
        />
        <Button type="button" onClick={() => texto.trim() && salvar.mutate()} disabled={salvar.isPending || !texto.trim()} className="self-start">
          {salvar.isPending ? 'Salvando…' : 'Salvar'}
        </Button>
      </Card>

      {registros && registros.length > 0 && (
        <div className="flex flex-col gap-2">
          <span className="text-sm font-semibold text-text">Escritas anteriores</span>
          {registros.map((r) => (
            <Card key={r.id} className="flex flex-col gap-1.5">
              <span className="text-xs text-text-tertiary">{new Date(r.data).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}</span>
              <p className="text-sm text-text-secondary">{r.texto}</p>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
