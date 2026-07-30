'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { TERMINATION_TIPO_LABEL, TerminationTipo } from '@/lib/format';
import { Button, Card, EmptyState } from '@/components/ui';
import { Header } from '@/components/header';

type DocTemplateTipo = 'AVISO_PREVIO' | 'TERMO_RESCISAO' | 'CARTA_REFERENCIA';

const DOC_TIPO_LABEL: Record<DocTemplateTipo, string> = {
  AVISO_PREVIO: 'Aviso prévio',
  TERMO_RESCISAO: 'Termo de rescisão',
  CARTA_REFERENCIA: 'Carta de referência',
};

interface DocumentTemplate {
  id: string;
  tipo: DocTemplateTipo;
  nome: string;
  corpo: string;
  aplicaTipos: string[];
  ativo: boolean;
}

const VARIAVEIS_DISPONIVEIS = [
  'empresa.razaoSocial', 'empresa.nomeFantasia', 'empresa.cnpj', 'empresa.cidade', 'empresa.uf', 'data.hoje',
  'colaborador.nome', 'colaborador.matricula', 'colaborador.cargo', 'colaborador.setor',
  'desligamento.data', 'desligamento.tipoLabel', 'desligamento.diasAviso', 'desligamento.avisoPrevioInicio',
  'desligamento.avisoPrevioFim', 'desligamento.dataPagamento', 'desligamento.totalRescisao',
];

function ModelosDeDocumentos() {
  const queryClient = useQueryClient();
  const [tipoDoc, setTipoDoc] = useState<DocTemplateTipo>('AVISO_PREVIO');
  const [tipoDesligamento, setTipoDesligamento] = useState<TerminationTipo>('SEM_JUSTA_CAUSA');
  const [corpo, setCorpo] = useState<string | null>(null);

  const { data: templates } = useQuery({
    queryKey: ['document-templates', tipoDoc],
    queryFn: async () => (await api.get<DocumentTemplate[]>('/rh/document-templates', { params: { tipo: tipoDoc } })).data,
  });

  const template = templates?.find((t) => t.aplicaTipos.includes(tipoDesligamento)) ?? templates?.find((t) => t.aplicaTipos.length === 0);
  const corpoAtual = corpo ?? template?.corpo ?? '';

  const save = useMutation({
    mutationFn: async () => {
      if (!template) return;
      return api.patch(`/rh/document-templates/${template.id}`, { corpo: corpoAtual });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['document-templates', tipoDoc] }),
  });

  const restaurar = useMutation({
    mutationFn: async () => {
      if (!template) return;
      return api.post(`/rh/document-templates/${template.id}/restaurar-padrao`);
    },
    onSuccess: () => {
      setCorpo(null);
      queryClient.invalidateQueries({ queryKey: ['document-templates', tipoDoc] });
    },
  });

  return (
    <Card className="flex max-w-3xl flex-col gap-4">
      <p className="text-xs text-text-tertiary">
        Edite o texto usado ao gerar cada documento de desligamento. Use as variáveis entre chaves — elas são
        substituídas automaticamente pelos dados do processo ao gerar o documento.
      </p>
      <div className="flex flex-wrap gap-3">
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="text-text-secondary">Documento</span>
          <select
            value={tipoDoc}
            onChange={(e) => { setTipoDoc(e.target.value as DocTemplateTipo); setCorpo(null); }}
            className="w-56 rounded-[10px] border border-border-strong bg-surface px-3 py-2"
          >
            {(Object.entries(DOC_TIPO_LABEL) as [DocTemplateTipo, string][]).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="text-text-secondary">Tipo de desligamento</span>
          <select
            value={tipoDesligamento}
            onChange={(e) => { setTipoDesligamento(e.target.value as TerminationTipo); setCorpo(null); }}
            className="w-56 rounded-[10px] border border-border-strong bg-surface px-3 py-2"
          >
            {(Object.entries(TERMINATION_TIPO_LABEL) as [TerminationTipo, string][]).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </label>
      </div>

      {!template && <EmptyState>Nenhum modelo configurado para essa combinação ainda.</EmptyState>}

      {template && (
        <>
          <textarea
            value={corpoAtual}
            onChange={(e) => setCorpo(e.target.value)}
            rows={16}
            className="rounded-[10px] border border-border-strong bg-surface px-3 py-2 font-mono text-xs leading-relaxed"
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
                <code key={v} className="rounded-[6px] bg-surface-alt px-1.5 py-0.5 text-[11px] text-text-secondary">
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

interface ChecklistItem {
  key: string;
  nome: string;
  ativo: boolean;
  bloqueante: boolean;
  categoria: 'PROCESSO' | 'COMPLIANCE';
  aplicaTipos: string[];
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
  const [secao, setSecao] = useState<'checklist' | 'modelos'>('checklist');
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
        <div className="mb-4 flex gap-2">
          <button
            type="button"
            onClick={() => setSecao('checklist')}
            className={`rounded-full border px-4 py-2 text-sm transition ${
              secao === 'checklist' ? 'border-accent bg-accent text-on-accent font-medium' : 'border-border-strong bg-surface text-text hover:border-accent'
            }`}
          >
            Checklist
          </button>
          <button
            type="button"
            onClick={() => setSecao('modelos')}
            className={`rounded-full border px-4 py-2 text-sm transition ${
              secao === 'modelos' ? 'border-accent bg-accent text-on-accent font-medium' : 'border-border-strong bg-surface text-text hover:border-accent'
            }`}
          >
            Modelos de documentos
          </button>
        </div>

        {secao === 'modelos' && <ModelosDeDocumentos />}

        {secao === 'checklist' && (
        <Card className="flex max-w-3xl flex-col gap-3">
          <p className="text-xs text-text-tertiary">
            Itens bloqueantes impedem a conclusão do desligamento enquanto pendentes. &quot;Aplica a&quot; vazio significa que o
            item vale para todos os tipos de desligamento — selecione tipos específicos pra restringir (ex: itens exigidos só em
            justa causa).
          </p>
          <div className="flex flex-col gap-2">
            {current.map((item, i) => (
              <div key={item.key} className="flex flex-wrap items-center gap-3 rounded-[10px] border border-border p-2.5 text-sm">
                <span className="min-w-[160px] flex-1">{item.nome}</span>
                <select
                  value={item.categoria}
                  onChange={(e) =>
                    update(current.map((c, j) => (j === i ? { ...c, categoria: e.target.value as ChecklistItem['categoria'] } : c)))
                  }
                  className="rounded-[8px] border border-border-strong bg-surface px-2 py-1 text-xs"
                >
                  <option value="PROCESSO">Processo</option>
                  <option value="COMPLIANCE">Compliance</option>
                </select>
                <select
                  multiple
                  value={item.aplicaTipos}
                  onChange={(e) =>
                    update(
                      current.map((c, j) =>
                        j === i ? { ...c, aplicaTipos: Array.from(e.target.selectedOptions, (o) => o.value) } : c,
                      ),
                    )
                  }
                  className="h-16 w-40 rounded-[8px] border border-border-strong bg-surface px-2 py-1 text-xs"
                  title="Vazio = aplica a todos os tipos"
                >
                  {Object.entries(TERMINATION_TIPO_LABEL).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
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
              update([
                ...current,
                { key: slugifyKey(novoNome), nome: novoNome, ativo: true, bloqueante: true, categoria: 'PROCESSO', aplicaTipos: [] },
              ]);
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
        )}
      </main>
    </>
  );
}
