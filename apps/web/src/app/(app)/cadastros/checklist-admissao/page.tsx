'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { Button, Card } from '@/components/ui';
import { Header } from '@/components/header';

interface ChecklistItem {
  key: string;
  nome: string;
  ativo: boolean;
}

interface FilterOptions {
  filiais: string[];
}

function slugifyKey(nome: string): string {
  return nome
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/(^_|_$)/g, '');
}

export default function ChecklistAdmissaoPage() {
  const queryClient = useQueryClient();
  const { data: filterOptions } = useQuery({
    queryKey: ['employees', 'filter-options'],
    queryFn: async () => (await api.get<FilterOptions>('/rh/employees/filter-options')).data,
  });
  const [filial, setFilial] = useState('');
  const filialAtiva = filial || filterOptions?.filiais[0] || '';

  const { data: checklist } = useQuery({
    queryKey: ['admissions', 'checklist-config', filialAtiva],
    queryFn: async () => (await api.get<ChecklistItem[]>('/rh/admissions/checklist-config', { params: { filial: filialAtiva } })).data,
    enabled: !!filialAtiva,
  });
  const [items, setItems] = useState<ChecklistItem[] | null>(null);
  const [novoNome, setNovoNome] = useState('');
  const current = items ?? checklist ?? [];

  const save = useMutation({
    mutationFn: async (next: ChecklistItem[]) => api.put('/rh/admissions/checklist-config', { filial: filialAtiva, items: next }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admissions', 'checklist-config', filialAtiva] }),
  });

  function update(next: ChecklistItem[]) {
    setItems(next);
    save.mutate(next);
  }

  return (
    <>
      <Header eyebrow="Cadastros" title="Checklist de admissão" />
      <main className="flex-1 overflow-y-auto px-8 py-6">
        <Card className="flex max-w-2xl flex-col gap-3">
          <p className="text-xs text-text-tertiary">
            Documentos e etapas exigidos para efetivar uma admissão. O checklist é configurado por filial.
          </p>
          {!!filterOptions?.filiais.length && (
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="text-text-secondary">Filial</span>
              <select
                value={filialAtiva}
                onChange={(e) => { setFilial(e.target.value); setItems(null); }}
                className="w-64 rounded-[10px] border border-border-strong bg-surface px-3 py-2"
              >
                {filterOptions.filiais.map((f) => (
                  <option key={f} value={f}>{f}</option>
                ))}
              </select>
            </label>
          )}
          {!filterOptions?.filiais.length && (
            <p className="text-sm text-text-tertiary">
              Nenhuma filial cadastrada ainda — atribua uma filial a um colaborador para poder configurar o checklist.
            </p>
          )}
          {!!filialAtiva && (
            <>
              <div className="flex flex-col gap-2">
                {current.map((item, i) => (
                  <div key={item.key} className="flex items-center gap-3 rounded-[10px] border border-border p-2.5 text-sm">
                    <span className="flex-1">{item.nome}</span>
                    <label className="flex items-center gap-1.5 text-xs text-text-secondary">
                      <input
                        type="checkbox"
                        checked={item.ativo}
                        onChange={(e) => update(current.map((c, j) => (j === i ? { ...c, ativo: e.target.checked } : c)))}
                      />
                      Ativo
                    </label>
                  </div>
                ))}
                {current.length === 0 && <p className="text-sm text-text-tertiary">Nenhum item configurado ainda para esta filial.</p>}
              </div>
              <form
                className="flex items-end gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!novoNome.trim()) return;
                  update([...current, { key: slugifyKey(novoNome), nome: novoNome, ativo: true }]);
                  setNovoNome('');
                }}
              >
                <input
                  value={novoNome}
                  onChange={(e) => setNovoNome(e.target.value)}
                  placeholder="Novo item do checklist…"
                  className="flex-1 rounded-[10px] border border-border-strong bg-surface px-3 py-2 text-sm"
                />
                <Button type="submit" variant="secondary">
                  Adicionar
                </Button>
              </form>
            </>
          )}
        </Card>
      </main>
    </>
  );
}
