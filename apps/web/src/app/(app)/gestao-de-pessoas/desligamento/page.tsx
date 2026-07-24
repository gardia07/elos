'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { Badge, Button, Card } from '@/components/ui';

interface Termination {
  id: string;
  nome: string;
  cargo: string;
  data: string;
  tipo: 'SEM_JUSTA_CAUSA' | 'PEDIDO_DEMISSAO' | 'ACORDO';
  status: 'EM_ANDAMENTO' | 'CONCLUIDO';
}

interface Employee {
  id: string;
  nome: string;
}

interface ChecklistItem {
  key: string;
  nome: string;
  ativo: boolean;
  bloqueante: boolean;
}

const TIPO_LABEL = {
  SEM_JUSTA_CAUSA: 'Sem justa causa',
  PEDIDO_DEMISSAO: 'Pedido de demissão',
  ACORDO: 'Acordo (art. 484-A)',
} as const;

function slugifyKey(nome: string): string {
  return nome
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/(^_|_$)/g, '');
}

function ChecklistConfig() {
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
    <Card className="flex flex-col gap-3">
      <h3 className="text-sm font-semibold">Checklist de desligamento</h3>
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
  );
}

export default function DesligamentoPage() {
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(!!searchParams.get('employeeId'));
  const [showConfig, setShowConfig] = useState(false);
  const [employeeId, setEmployeeId] = useState(searchParams.get('employeeId') ?? '');
  const [tipo, setTipo] = useState<'SEM_JUSTA_CAUSA' | 'PEDIDO_DEMISSAO' | 'ACORDO'>('SEM_JUSTA_CAUSA');
  const [data, setData] = useState('');
  const [motivo, setMotivo] = useState('');

  const { data: terminations } = useQuery({
    queryKey: ['terminations'],
    queryFn: async () => (await api.get<Termination[]>('/rh/terminations')).data,
  });

  const { data: employees } = useQuery({
    queryKey: ['employees', 'ativos'],
    queryFn: async () => (await api.get<Employee[]>('/rh/employees', { params: { status: 'ATIVO' } })).data,
  });

  const create = useMutation({
    mutationFn: async () => api.post('/rh/terminations', { employeeId, tipo, data, motivo: motivo || undefined }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['terminations'] });
      setShowForm(false);
    },
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end gap-2">
        <Button variant="secondary" onClick={() => setShowConfig((s) => !s)}>
          {showConfig ? 'Fechar checklist' : 'Configurar checklist'}
        </Button>
        <Button onClick={() => setShowForm((s) => !s)}>{showForm ? 'Cancelar' : 'Novo desligamento'}</Button>
      </div>

      {showConfig && <ChecklistConfig />}

      {showForm && (
        <Card>
          <form
            className="flex flex-wrap items-end gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              create.mutate();
            }}
          >
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="text-text-secondary">Colaborador</span>
              <select
                value={employeeId}
                onChange={(e) => setEmployeeId(e.target.value)}
                required
                className="rounded-[10px] border border-border-strong bg-surface px-3 py-2"
              >
                <option value="">Selecione…</option>
                {employees?.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.nome}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="text-text-secondary">Tipo</span>
              <select
                value={tipo}
                onChange={(e) => setTipo(e.target.value as typeof tipo)}
                className="rounded-[10px] border border-border-strong bg-surface px-3 py-2"
              >
                <option value="SEM_JUSTA_CAUSA">Sem justa causa</option>
                <option value="PEDIDO_DEMISSAO">Pedido de demissão</option>
                <option value="ACORDO">Acordo (art. 484-A)</option>
              </select>
            </label>
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="text-text-secondary">Data</span>
              <input type="date" value={data} onChange={(e) => setData(e.target.value)} required className="rounded-[10px] border border-border-strong bg-surface px-3 py-2" />
            </label>
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="text-text-secondary">Motivo</span>
              <input value={motivo} onChange={(e) => setMotivo(e.target.value)} className="rounded-[10px] border border-border-strong bg-surface px-3 py-2" />
            </label>
            <Button type="submit" disabled={create.isPending}>
              Iniciar
            </Button>
          </form>
        </Card>
      )}

      <div className="flex flex-col gap-3">
        {terminations?.map((t) => (
          <Link key={t.id} href={`/gestao-de-pessoas/desligamento/${t.id}`}>
            <Card className="flex items-center justify-between hover:border-accent">
              <div>
                <div className="font-medium">{t.nome}</div>
                <div className="text-sm text-text-secondary">
                  {t.cargo} · {TIPO_LABEL[t.tipo]} · {new Date(t.data).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}
                </div>
              </div>
              <Badge tone={t.status === 'CONCLUIDO' ? 'green' : 'amber'}>
                {t.status === 'CONCLUIDO' ? 'Concluído' : 'Em andamento'}
              </Badge>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
