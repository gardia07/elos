'use client';

import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CalendarDays, Kanban, ListTodo, Sparkles, Wrench } from 'lucide-react';
import { api } from '@/lib/api-client';
import { complianceTone } from '@/lib/format';
import { Badge, Card, KpiCard } from '@/components/ui';
import { Header } from '@/components/header';
import { PriorityAlert, PriorityAlerts } from '@/components/priority-alerts';
import { CATALOG_BLOCKS } from '../ferramentas/catalogo/catalog-data';
import { ExternalIcon, ToolIcon } from '../ferramentas/catalogo/external-icons';
import type { AtalhoExterno } from '../ferramentas/catalogo/types';
import { TarefasDoDia } from './tarefas-do-dia';

const ATALHOS_PRINCIPAIS = [
  { nome: 'Agenda', href: '/agenda', Icon: CalendarDays },
  { nome: 'Planner', href: '/planner', Icon: ListTodo },
  { nome: 'Projetos', href: '/agenda/projetos', Icon: Kanban },
  { nome: 'Elô', href: '/elo', Icon: Sparkles },
  { nome: 'Ferramentas', href: '/ferramentas', Icon: Wrench },
];

interface License {
  modulos: string[];
}

interface Kpis {
  colaboradoresAtivos: number;
  colaboradoresAtivosDeltaPct: number | null;
  pendenciasAbertas: number;
  pendenciasAbertasDelta: number | null;
  conformidadeGeral: number;
  conformidadeGeralDelta: number | null;
  riscoGeral: 'Baixo' | 'Médio' | 'Alto';
  alertasCriticosAtivos: number;
}

interface Task {
  id: string;
  modulo: string;
  titulo: string;
  prioridade: 'BAIXA' | 'MEDIA' | 'ALTA' | 'CRITICA';
  origem: string;
  detalhes: { href?: string } | null;
}

const PRIORIDADE_PESO = { CRITICA: 3, ALTA: 2, MEDIA: 1, BAIXA: 0 } as const;
const PRIORIDADE_SEVERIDADE = { CRITICA: 'alta', ALTA: 'alta', MEDIA: 'media', BAIXA: 'baixa' } as const;
const RISCO_TONE = { Baixo: 'green', Médio: 'amber', Alto: 'red' } as const;

function Delta({ value, unidade, favoravel }: { value: number | null; unidade: string; favoravel: 'alto' | 'baixo' }) {
  if (value == null) return <span className="text-text-tertiary">Sem histórico suficiente</span>;
  if (value === 0) return <span className="text-text-tertiary">Estável vs. mês anterior</span>;
  const positivo = value > 0;
  const bom = favoravel === 'alto' ? positivo : !positivo;
  return (
    <span className={bom ? 'text-success' : 'text-danger'}>
      {positivo ? '↑' : '↓'} {positivo ? '+' : ''}
      {value}
      {unidade} vs. mês anterior
    </span>
  );
}

export default function PainelPage() {
  const queryClient = useQueryClient();

  const { data: kpis } = useQuery({
    queryKey: ['dashboard', 'kpis'],
    queryFn: async () => (await api.get<Kpis>('/dashboard/kpis')).data,
  });

  const { data: tasks } = useQuery({
    queryKey: ['dashboard', 'tasks'],
    queryFn: async () => (await api.get<Task[]>('/dashboard/tasks')).data,
  });

  const completeTask = useMutation({
    mutationFn: async (id: string) => api.patch(`/dashboard/tasks/${id}`, { status: 'CONCLUIDA' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['dashboard', 'tasks'] }),
  });

  const { data: license } = useQuery({
    queryKey: ['license'],
    queryFn: async () => (await api.get<License>('/license')).data,
  });

  const { data: atalhosExternos } = useQuery({
    queryKey: ['ferramentas', 'atalhos-externos'],
    queryFn: async () => (await api.get<AtalhoExterno[]>('/ferramentas/atalhos-externos')).data,
  });

  // Sem dado de uso real ainda — mostra as primeiras ferramentas do catálogo
  // já disponíveis (com link) dentre os módulos contratados pelo tenant.
  const modulosContratados = license?.modulos ?? [];
  const ferramentasAtalho = CATALOG_BLOCKS.filter((b) => b.modulo === null || modulosContratados.includes(b.modulo))
    .flatMap((b) => b.ferramentas.filter((t): t is { nome: string; href: string } => t.href !== null))
    .slice(0, 6);

  const alertasPrioritarios: PriorityAlert[] = (tasks ?? [])
    .filter((t) => t.origem === 'SISTEMA')
    .sort((a, b) => PRIORIDADE_PESO[b.prioridade] - PRIORIDADE_PESO[a.prioridade])
    .map((t) => ({ id: t.id, categoria: t.modulo, mensagem: t.titulo, severidade: PRIORIDADE_SEVERIDADE[t.prioridade], href: t.detalhes?.href }));

  return (
    <>
      <Header eyebrow="Seu dia a dia" title="Área de trabalho" />
      <main className="flex-1 overflow-y-auto px-8 py-6">
        <div className="flex flex-col gap-6">
          <div className="grid grid-cols-4 gap-4">
            <KpiCard
              label="Conformidade geral"
              value={<Badge tone={complianceTone(kpis?.conformidadeGeral ?? 0)}>{kpis?.conformidadeGeral ?? '—'}%</Badge>}
              delta={<Delta value={kpis?.conformidadeGeralDelta ?? null} unidade=" pts" favoravel="alto" />}
            />
            <KpiCard
              label="Pendências em aberto"
              value={kpis?.pendenciasAbertas ?? '—'}
              delta={<Delta value={kpis?.pendenciasAbertasDelta ?? null} unidade="" favoravel="baixo" />}
            />
            <KpiCard
              label="Colaboradores ativos"
              value={kpis?.colaboradoresAtivos.toLocaleString('pt-BR') ?? '—'}
              delta={<Delta value={kpis?.colaboradoresAtivosDeltaPct ?? null} unidade="%" favoravel="alto" />}
            />
            <KpiCard
              label="Risco geral"
              value={kpis && <Badge tone={RISCO_TONE[kpis.riscoGeral]}>{kpis.riscoGeral}</Badge>}
              delta={<span className="text-text-tertiary">{kpis?.alertasCriticosAtivos ?? 0} alerta(s) crítico(s) ativo(s)</span>}
            />
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
            <div className="lg:col-span-3">
              <TarefasDoDia />
            </div>
            <div className="lg:col-span-2">
              <PriorityAlerts alertas={alertasPrioritarios} onResolver={(id) => completeTask.mutate(id)} />
            </div>
          </div>

          <Card>
            <h3 className="mb-3 text-sm font-semibold">Atalhos</h3>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
              {ATALHOS_PRINCIPAIS.map(({ nome, href, Icon }) => (
                <Link
                  key={nome}
                  href={href}
                  className="flex flex-col items-start gap-2 rounded-[10px] border border-border p-3 transition hover:border-accent"
                >
                  <Icon className="h-4 w-4 text-accent" />
                  <span className="text-xs font-medium text-text">{nome}</span>
                </Link>
              ))}
            </div>
          </Card>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Card>
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-semibold">Ferramentas</h3>
                <Link href="/ferramentas/catalogo" className="text-xs text-accent hover:underline">
                  Ver todas →
                </Link>
              </div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {ferramentasAtalho.map((tool) => (
                  <Link
                    key={tool.nome}
                    href={tool.href}
                    className="flex flex-col items-start gap-2 rounded-[10px] border border-border p-3 transition hover:border-accent"
                  >
                    <ToolIcon nome={tool.nome} className="h-4 w-4 text-accent" />
                    <span className="text-xs font-medium text-text">{tool.nome}</span>
                  </Link>
                ))}
                {ferramentasAtalho.length === 0 && <p className="text-sm text-text-tertiary">Nenhuma ferramenta disponível ainda.</p>}
              </div>
            </Card>

            <Card>
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-semibold">Atalhos externos</h3>
                <Link href="/ferramentas/catalogo" className="text-xs text-accent hover:underline">
                  Ver todos →
                </Link>
              </div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {atalhosExternos?.slice(0, 6).map((a) => (
                  <a
                    key={a.id}
                    href={a.url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex flex-col items-start gap-2 rounded-[10px] border border-border p-3 transition hover:border-accent"
                  >
                    <ExternalIcon nome={a.icone} className="h-4 w-4 text-accent" />
                    <span className="text-xs font-medium text-text">{a.nome}</span>
                  </a>
                ))}
                {atalhosExternos?.length === 0 && <p className="text-sm text-text-tertiary">Nenhum atalho configurado ainda.</p>}
              </div>
            </Card>
          </div>
        </div>
      </main>
    </>
  );
}
