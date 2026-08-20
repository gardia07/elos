'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight, Plus, Trash2 } from 'lucide-react';
import { api } from '@/lib/api-client';
import { Button, Card } from '@/components/ui';
import type { CategoriaFinanceira, FinancaTipo } from './types';
import type { SecaoTema } from './theme';
import { SectionHeader } from './section-header';
import { formatBRL, MESES } from './lib';

function CategoriaLinha({
  categoria,
  mes,
  onSetValor,
  onExcluir,
}: {
  categoria: CategoriaFinanceira;
  mes: number;
  onSetValor: (valor: number) => void;
  onExcluir: () => void;
}) {
  const [valor, setValor] = useState(String(categoria.valoresPorMes[mes + 1] ?? ''));

  return (
    <div className="flex items-center gap-3 rounded-container border border-border p-3">
      <span className="flex-1 text-sm text-text">{categoria.nome}</span>
      <span className="text-xs text-text-tertiary">R$</span>
      <input
        type="number"
        step="0.01"
        value={valor}
        onChange={(e) => setValor(e.target.value)}
        onBlur={() => {
          const n = Number(valor);
          if (!Number.isNaN(n)) onSetValor(n);
        }}
        className="w-28 rounded-control border border-border-strong bg-surface px-2 py-1.5 text-right text-sm"
      />
      <button type="button" onClick={onExcluir} className="text-text-tertiary hover:text-danger">
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

export function FinancasSection({ ano, tema }: { ano: number; tema: SecaoTema }) {
  const queryClient = useQueryClient();
  const [mes, setMes] = useState(new Date().getMonth());
  const [novoNomeReceita, setNovoNomeReceita] = useState('');
  const [novoNomeDespesa, setNovoNomeDespesa] = useState('');

  const { data: categorias } = useQuery({
    queryKey: ['planner', 'financas', ano],
    queryFn: async () => (await api.get<CategoriaFinanceira[]>('/planner/financas', { params: { ano } })).data,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['planner', 'financas', ano] });

  const criarCategoria = useMutation({
    mutationFn: async (vars: { nome: string; tipo: FinancaTipo }) => api.post('/planner/financas/categorias', { ano, nome: vars.nome, tipo: vars.tipo }),
    onSuccess: invalidate,
  });

  const excluirCategoria = useMutation({
    mutationFn: async (id: string) => api.delete(`/planner/financas/categorias/${id}`),
    onSuccess: invalidate,
  });

  const setLancamento = useMutation({
    mutationFn: async (vars: { categoriaId: string; valor: number }) =>
      api.put(`/planner/financas/categorias/${vars.categoriaId}/lancamentos/${mes + 1}`, { valor: vars.valor }),
    onSuccess: invalidate,
  });

  const receitas = categorias?.filter((c) => c.tipo === 'RECEITA') ?? [];
  const despesas = categorias?.filter((c) => c.tipo === 'DESPESA') ?? [];

  const totalReceitas = useMemo(() => receitas.reduce((acc, c) => acc + (c.valoresPorMes[mes + 1] ?? 0), 0), [receitas, mes]);
  const totalDespesas = useMemo(() => despesas.reduce((acc, c) => acc + (c.valoresPorMes[mes + 1] ?? 0), 0), [despesas, mes]);
  const saldo = totalReceitas - totalDespesas;

  return (
    <div className="flex max-w-3xl flex-col gap-5">
      <SectionHeader
        tema={tema}
        stat={
          <>
            <span className="text-2xl font-semibold" style={{ color: saldo >= 0 ? tema.cor : undefined }}>
              <span className={saldo < 0 ? 'text-danger' : ''}>{formatBRL(saldo)}</span>
            </span>
            <p className="text-xs text-text-tertiary">saldo de {MESES[mes].toLowerCase()}</p>
          </>
        }
      />

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

      <div className="grid grid-cols-2 gap-3">
        <Card className="flex flex-col gap-1">
          <span className="text-xs text-text-tertiary">Receitas</span>
          <span className="text-lg font-semibold text-success">{formatBRL(totalReceitas)}</span>
        </Card>
        <Card className="flex flex-col gap-1">
          <span className="text-xs text-text-tertiary">Despesas</span>
          <span className="text-lg font-semibold text-danger">{formatBRL(totalDespesas)}</span>
        </Card>
      </div>

      <Card className="flex flex-col gap-2.5">
        <span className="text-sm font-semibold text-text">Receitas</span>
        {receitas.map((c) => (
          <CategoriaLinha
            key={c.id}
            categoria={c}
            mes={mes}
            onSetValor={(valor) => setLancamento.mutate({ categoriaId: c.id, valor })}
            onExcluir={() => excluirCategoria.mutate(c.id)}
          />
        ))}
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (novoNomeReceita.trim()) {
              criarCategoria.mutate({ nome: novoNomeReceita.trim(), tipo: 'RECEITA' });
              setNovoNomeReceita('');
            }
          }}
        >
          <input
            value={novoNomeReceita}
            onChange={(e) => setNovoNomeReceita(e.target.value)}
            placeholder="Ex.: salário, freelance…"
            className="flex-1 rounded-control border border-border-strong bg-surface px-3 py-2 text-sm"
          />
          <Button type="submit" variant="secondary" disabled={!novoNomeReceita.trim()} className="flex items-center gap-1.5">
            <Plus className="h-4 w-4" /> Categoria
          </Button>
        </form>
      </Card>

      <Card className="flex flex-col gap-2.5">
        <span className="text-sm font-semibold text-text">Despesas</span>
        {despesas.map((c) => (
          <CategoriaLinha
            key={c.id}
            categoria={c}
            mes={mes}
            onSetValor={(valor) => setLancamento.mutate({ categoriaId: c.id, valor })}
            onExcluir={() => excluirCategoria.mutate(c.id)}
          />
        ))}
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (novoNomeDespesa.trim()) {
              criarCategoria.mutate({ nome: novoNomeDespesa.trim(), tipo: 'DESPESA' });
              setNovoNomeDespesa('');
            }
          }}
        >
          <input
            value={novoNomeDespesa}
            onChange={(e) => setNovoNomeDespesa(e.target.value)}
            placeholder="Ex.: aluguel, mercado…"
            className="flex-1 rounded-control border border-border-strong bg-surface px-3 py-2 text-sm"
          />
          <Button type="submit" variant="secondary" disabled={!novoNomeDespesa.trim()} className="flex items-center gap-1.5">
            <Plus className="h-4 w-4" /> Categoria
          </Button>
        </form>
      </Card>
    </div>
  );
}
