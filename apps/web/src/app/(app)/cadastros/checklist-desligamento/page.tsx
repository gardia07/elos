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
  bloqueante: boolean;
}

function slugifyKey(nome: string): string {
  return nome
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/(^_|_$)/g, '');
}

export default function ChecklistDesligamentoPage() {
  const queryClient = useQueryClient();
  const { data: checklist } = useQuery({
    queryKey: ['terminations', 'checklist-config'],
    queryFn: async () => (await api.get<ChecklistItem[]>('/rh/terminations/checklist-config')).data,
  });
  const [items, setItems] = useState<ChecklistItem[] | null>(null);
  const [novoNome, setNovoNome] = useState('');
  const current = items ?? checklist ?? [];

  const save = useMutation({
    mutationFn: async (next: ChecklistItem[]) => api.put('/rh/terminations/checklist-config', { items: next }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['terminations', 'checklist-config'] }),
  });

  function update(next: ChecklistItem[]) {
    setItems(next);
    save.mutate(next);
  }

  return (
    <>
      <Header eyebrow="Cadastros" title="Checklist de desligamento" />
      <main className="flex-1 overflow-y-auto px-8 py-6">
        <Card className="flex max-w-2xl flex-col gap-3">
          <p className="text-xs text-text-tertiary">
            Itens marcados como bloqueantes impedem a conclusão do desligamento enquanto pendentes; os demais são apenas informativos.
          </p>
          <div className="flex flex-col gap-2">
            {current.map((item, i) => (
              <div key={item.key} className="flex items-center gap-3 rounded-[10px] border border-border p-2.5 text-sm">
                <span className="flex-1">{item.nome}</span>
                <label className="flex items-center gap-1.5 text-xs text-text-secondary">
                  <input
                    type="checkbox"
                    checked={item.bloqueante}
                    onChange={(e) => update(current.map((c, j) => (j === i ? { ...c, bloqueante: e.target.checked } : c)))}
                  />
                  Bloqueante
                </label>
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
            {current.length === 0 && <p className="text-sm text-text-tertiary">Nenhum item configurado ainda.</p>}
          </div>
          <form
            className="flex items-end gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (!novoNome.trim()) return;
              update([...current, { key: slugifyKey(novoNome), nome: novoNome, ativo: true, bloqueante: true }]);
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
        </Card>
      </main>
    </>
  );
}
