'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { Button, Card, EmptyState } from '@/components/ui';
import { Header } from '@/components/header';

interface ChecklistItem {
  key: string;
  nome: string;
  ativo: boolean;
}

interface FilterOptions {
  filiais: string[];
}

interface DocumentTemplate {
  id: string;
  tipo: 'CONTRATO_ADMISSAO';
  nome: string;
  corpo: string;
  ativo: boolean;
}

const VARIAVEIS_DISPONIVEIS = [
  'empresa.razaoSocial', 'empresa.nomeFantasia', 'empresa.cnpj', 'empresa.cidade', 'empresa.uf', 'data.hoje',
  'admissao.nome', 'admissao.cargo', 'admissao.dataInicio', 'admissao.salario',
];

function ModeloDeContrato() {
  const queryClient = useQueryClient();
  const [corpo, setCorpo] = useState<string | null>(null);

  const { data: templates } = useQuery({
    queryKey: ['document-templates', 'CONTRATO_ADMISSAO'],
    queryFn: async () => (await api.get<DocumentTemplate[]>('/rh/document-templates', { params: { tipo: 'CONTRATO_ADMISSAO' } })).data,
  });
  const template = templates?.[0];
  const corpoAtual = corpo ?? template?.corpo ?? '';

  const save = useMutation({
    mutationFn: async () => {
      if (!template) return;
      return api.patch(`/rh/document-templates/${template.id}`, { corpo: corpoAtual });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['document-templates', 'CONTRATO_ADMISSAO'] }),
  });

  const restaurar = useMutation({
    mutationFn: async () => {
      if (!template) return;
      return api.post(`/rh/document-templates/${template.id}/restaurar-padrao`);
    },
    onSuccess: () => {
      setCorpo(null);
      queryClient.invalidateQueries({ queryKey: ['document-templates', 'CONTRATO_ADMISSAO'] });
    },
  });

  return (
    <Card className="flex max-w-3xl flex-col gap-4">
      <p className="text-xs text-text-tertiary">
        Edite o texto usado ao gerar o contrato de admissão. Use as variáveis entre chaves — elas são substituídas
        automaticamente pelos dados da admissão ao gerar o documento.
      </p>
      {!template && <EmptyState>Nenhum modelo configurado ainda.</EmptyState>}
      {template && (
        <>
          <textarea
            value={corpoAtual}
            onChange={(e) => setCorpo(e.target.value)}
            rows={16}
            className="rounded-control border border-border-strong bg-surface px-3 py-2 font-mono text-xs leading-relaxed"
          />
          <div className="flex items-center gap-2">
            <Button disabled={save.isPending} onClick={() => save.mutate()}>
              {save.isPending ? 'Salvando…' : 'Salvar'}
            </Button>
            <Button variant="secondary" disabled={restaurar.isPending} onClick={() => restaurar.mutate()}>
              Restaurar padrão do sistema
            </Button>
          </div>
          <div>
            <span className="text-[10.5px] font-semibold uppercase tracking-[0.06em] text-text-tertiary">
              Variáveis disponíveis
            </span>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {VARIAVEIS_DISPONIVEIS.map((v) => (
                <code key={v} className="rounded-container bg-surface-alt px-1.5 py-0.5 text-[11px] text-text-secondary">
                  {`{{${v}}}`}
                </code>
              ))}
            </div>
          </div>
        </>
      )}
    </Card>
  );
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
  const [secao, setSecao] = useState<'checklist' | 'modelo'>('checklist');
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
        <div className="mb-4 flex gap-2">
          <button
            type="button"
            onClick={() => setSecao('checklist')}
            className={`rounded-control border px-4 py-2 text-sm transition ${
              secao === 'checklist' ? 'border-accent bg-accent text-on-accent font-medium' : 'border-border-strong bg-surface text-text hover:border-accent'
            }`}
          >
            Checklist
          </button>
          <button
            type="button"
            onClick={() => setSecao('modelo')}
            className={`rounded-control border px-4 py-2 text-sm transition ${
              secao === 'modelo' ? 'border-accent bg-accent text-on-accent font-medium' : 'border-border-strong bg-surface text-text hover:border-accent'
            }`}
          >
            Modelo do contrato
          </button>
        </div>

        {secao === 'modelo' && <ModeloDeContrato />}

        {secao === 'checklist' && (
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
                className="w-64 rounded-control border border-border-strong bg-surface px-3 py-2"
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
                  <div key={item.key} className="flex items-center gap-3 rounded-container border border-border p-2.5 text-sm">
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
                  className="flex-1 rounded-control border border-border-strong bg-surface px-3 py-2 text-sm"
                />
                <Button type="submit" variant="secondary">
                  Adicionar
                </Button>
              </form>
            </>
          )}
        </Card>
        )}
      </main>
    </>
  );
}
