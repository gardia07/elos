'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { Badge, Button, Card } from '@/components/ui';

interface Agreement {
  id: string;
  sindicato: string;
  vigenciaFim: string;
  reajustePercentual: string;
  clausulas: string | null;
  reajusteAplicadoEm: string | null;
}

export default function CctPage() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [sindicato, setSindicato] = useState('');
  const [vigenciaInicio, setVigenciaInicio] = useState('');
  const [vigenciaFim, setVigenciaFim] = useState('');
  const [reajustePercentual, setReajustePercentual] = useState('');
  const [clausulas, setClausulas] = useState('');

  const { data } = useQuery({
    queryKey: ['dp', 'agreements'],
    queryFn: async () => (await api.get<Agreement[]>('/dp/agreements')).data,
  });

  const create = useMutation({
    mutationFn: async () =>
      api.post('/dp/agreements', {
        sindicato,
        vigenciaInicio,
        vigenciaFim,
        reajustePercentual: Number(reajustePercentual),
        clausulas: clausulas || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dp', 'agreements'] });
      setShowForm(false);
    },
  });

  const applyReajuste = useMutation({
    mutationFn: async (id: string) => (await api.post(`/dp/agreements/${id}/apply-reajuste`, {})).data,
    onSuccess: (data: { updated: number }) => {
      queryClient.invalidateQueries({ queryKey: ['dp', 'agreements'] });
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      alert(`Reajuste aplicado a ${data.updated} colaborador(es) ativo(s).`);
    },
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <Button onClick={() => setShowForm((s) => !s)}>{showForm ? 'Cancelar' : 'Nova convenção'}</Button>
      </div>

      {showForm && (
        <Card>
          <form
            className="flex flex-col gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              create.mutate();
            }}
          >
            <div className="flex flex-wrap items-end gap-3">
              <label className="flex flex-col gap-1.5 text-sm">
                <span className="text-text-secondary">Sindicato</span>
                <input value={sindicato} onChange={(e) => setSindicato(e.target.value)} required className="rounded-[10px] border border-border-strong bg-surface px-3 py-2" />
              </label>
              <label className="flex flex-col gap-1.5 text-sm">
                <span className="text-text-secondary">Vigência início</span>
                <input type="date" value={vigenciaInicio} onChange={(e) => setVigenciaInicio(e.target.value)} required className="rounded-[10px] border border-border-strong bg-surface px-3 py-2" />
              </label>
              <label className="flex flex-col gap-1.5 text-sm">
                <span className="text-text-secondary">Vigência fim</span>
                <input type="date" value={vigenciaFim} onChange={(e) => setVigenciaFim(e.target.value)} required className="rounded-[10px] border border-border-strong bg-surface px-3 py-2" />
              </label>
              <label className="flex flex-col gap-1.5 text-sm">
                <span className="text-text-secondary">Reajuste (%)</span>
                <input type="number" step="0.1" value={reajustePercentual} onChange={(e) => setReajustePercentual(e.target.value)} required className="w-24 rounded-[10px] border border-border-strong bg-surface px-3 py-2" />
              </label>
            </div>
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="text-text-secondary">Cláusulas</span>
              <textarea value={clausulas} onChange={(e) => setClausulas(e.target.value)} rows={2} className="rounded-[10px] border border-border-strong bg-surface px-3 py-2" />
            </label>
            <Button type="submit" disabled={create.isPending} className="self-start">
              Salvar convenção
            </Button>
          </form>
        </Card>
      )}

      <div className="flex flex-col gap-3">
        {data?.map((a) => (
          <Card key={a.id} className="flex flex-col gap-2">
            <div className="flex items-start justify-between">
              <div>
                <div className="font-medium">{a.sindicato}</div>
                <div className="text-sm text-text-secondary">Vigente até {new Date(a.vigenciaFim).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}</div>
              </div>
              <Badge tone="blue">Reajuste {a.reajustePercentual}%</Badge>
            </div>
            {a.clausulas && <p className="text-sm text-text-secondary">{a.clausulas}</p>}
            <div>
              {a.reajusteAplicadoEm ? (
                <Badge tone="green">Reajuste aplicado em {new Date(a.reajusteAplicadoEm).toLocaleDateString('pt-BR')}</Badge>
              ) : (
                <Button
                  variant="secondary"
                  disabled={applyReajuste.isPending}
                  onClick={() => {
                    if (confirm(`Aplicar reajuste de ${a.reajustePercentual}% ao salário de todos os colaboradores ativos?`)) {
                      applyReajuste.mutate(a.id);
                    }
                  }}
                >
                  Aplicar reajuste aos colaboradores ativos
                </Button>
              )}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
