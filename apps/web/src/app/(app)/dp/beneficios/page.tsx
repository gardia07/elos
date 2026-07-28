'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { Badge, Button, Card } from '@/components/ui';

interface CoparticipacaoRegra {
  id: string;
  percentualEmpresa: string;
  percentualColab: string;
}

interface BeneficioTipo {
  id: string;
  nome: string;
  categoria: 'ALIMENTACAO' | 'ACADEMIA' | 'SAUDE' | 'OUTRO';
  coparticipacao: CoparticipacaoRegra | null;
}

interface ConvenioAcademia {
  id: string;
  nome: string;
  valorMensalidade: string;
}

interface FaixaEtaria {
  id: string;
  idadeMin: number;
  idadeMax: number;
  valor: string;
}

interface PlanoSaude {
  id: string;
  nome: string;
  operadora: string | null;
  faixasEtarias: FaixaEtaria[];
}

interface Feriado {
  id: string;
  data: string;
  abrangencia: 'NACIONAL' | 'ESTADUAL' | 'MUNICIPAL';
  nome: string;
  uf: string | null;
  municipioIbge: string | null;
}

const CATEGORIA_LABEL: Record<BeneficioTipo['categoria'], string> = {
  ALIMENTACAO: 'Alimentação',
  ACADEMIA: 'Academia',
  SAUDE: 'Saúde',
  OUTRO: 'Outro',
};

const ABRANGENCIA_LABEL: Record<Feriado['abrangencia'], string> = {
  NACIONAL: 'Nacional',
  ESTADUAL: 'Estadual',
  MUNICIPAL: 'Municipal',
};

function formatBRL(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}
function formatDate(v: string) {
  return new Date(v).toLocaleDateString('pt-BR', { timeZone: 'UTC' });
}

const TABS = ['tipos', 'academia', 'saude', 'feriados', 'apuracao'] as const;
type Tab = (typeof TABS)[number];
const TAB_LABEL: Record<Tab, string> = {
  tipos: 'Tipos e coparticipação',
  academia: 'Convênios de academia',
  saude: 'Planos de saúde',
  feriados: 'Feriados',
  apuracao: 'Apuração mensal',
};

export default function BeneficiosPage() {
  const [tab, setTab] = useState<Tab>('tipos');

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-2 border-b border-divider">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-3 py-2 text-sm ${tab === t ? 'border-b-2 border-accent font-medium text-text' : 'text-text-secondary'}`}
          >
            {TAB_LABEL[t]}
          </button>
        ))}
      </div>

      {tab === 'tipos' && <TiposTab />}
      {tab === 'academia' && <AcademiaTab />}
      {tab === 'saude' && <SaudeTab />}
      {tab === 'feriados' && <FeriadosTab />}
      {tab === 'apuracao' && <ApuracaoTab />}
    </div>
  );
}

function TiposTab() {
  const queryClient = useQueryClient();
  const [nome, setNome] = useState('');
  const [categoria, setCategoria] = useState<BeneficioTipo['categoria']>('ALIMENTACAO');
  const [editingCopart, setEditingCopart] = useState<string | null>(null);
  const [percEmpresa, setPercEmpresa] = useState('');
  const [percColab, setPercColab] = useState('');

  const { data: tipos } = useQuery({
    queryKey: ['dp', 'benefits', 'tipos'],
    queryFn: async () => (await api.get<BeneficioTipo[]>('/dp/benefits/tipos')).data,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['dp', 'benefits', 'tipos'] });

  const create = useMutation({
    mutationFn: async () => api.post('/dp/benefits/tipos', { nome, categoria }),
    onSuccess: () => {
      invalidate();
      setNome('');
    },
  });

  const saveCopart = useMutation({
    mutationFn: async (tipoId: string) =>
      api.post(`/dp/benefits/tipos/${tipoId}/coparticipacao`, {
        percentualEmpresa: Number(percEmpresa),
        percentualColab: Number(percColab),
      }),
    onSuccess: () => {
      invalidate();
      setEditingCopart(null);
    },
  });

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <form
          className="flex flex-wrap items-end gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            create.mutate();
          }}
        >
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="text-text-secondary">Nome</span>
            <input
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="VA, VR, Plano de Saúde…"
              required
              className="rounded-[10px] border border-border-strong bg-surface px-3 py-2"
            />
          </label>
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="text-text-secondary">Categoria</span>
            <select
              value={categoria}
              onChange={(e) => setCategoria(e.target.value as BeneficioTipo['categoria'])}
              className="rounded-[10px] border border-border-strong bg-surface px-3 py-2"
            >
              {(Object.keys(CATEGORIA_LABEL) as BeneficioTipo['categoria'][]).map((c) => (
                <option key={c} value={c}>
                  {CATEGORIA_LABEL[c]}
                </option>
              ))}
            </select>
          </label>
          <Button type="submit" disabled={create.isPending}>
            Adicionar tipo
          </Button>
        </form>
      </Card>

      <Card className="p-0">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-divider text-left text-text-tertiary">
              <th className="px-5 py-3 font-medium">Nome</th>
              <th className="px-5 py-3 font-medium">Categoria</th>
              <th className="px-5 py-3 font-medium">Coparticipação (empresa / colaborador)</th>
              <th className="px-5 py-3 font-medium" />
            </tr>
          </thead>
          <tbody>
            {tipos?.map((t) => (
              <tr key={t.id} className="border-b border-divider last:border-0">
                <td className="px-5 py-3 font-medium">{t.nome}</td>
                <td className="px-5 py-3">
                  <Badge tone="blue">{CATEGORIA_LABEL[t.categoria]}</Badge>
                </td>
                <td className="px-5 py-3">
                  {editingCopart === t.id ? (
                    <form
                      className="flex items-center gap-2"
                      onSubmit={(e) => {
                        e.preventDefault();
                        saveCopart.mutate(t.id);
                      }}
                    >
                      <input
                        type="number"
                        min={0}
                        max={100}
                        step="0.01"
                        value={percEmpresa}
                        onChange={(e) => setPercEmpresa(e.target.value)}
                        placeholder="% empresa"
                        required
                        className="w-24 rounded-[10px] border border-border-strong bg-surface px-2 py-1.5 text-sm"
                      />
                      <input
                        type="number"
                        min={0}
                        max={100}
                        step="0.01"
                        value={percColab}
                        onChange={(e) => setPercColab(e.target.value)}
                        placeholder="% colaborador"
                        required
                        className="w-28 rounded-[10px] border border-border-strong bg-surface px-2 py-1.5 text-sm"
                      />
                      <Button type="submit" variant="secondary" disabled={saveCopart.isPending}>
                        Salvar
                      </Button>
                    </form>
                  ) : t.coparticipacao ? (
                    <span className="text-text-secondary">
                      {Number(t.coparticipacao.percentualEmpresa)}% / {Number(t.coparticipacao.percentualColab)}%
                    </span>
                  ) : (
                    <span className="text-text-tertiary">Não definida</span>
                  )}
                </td>
                <td className="px-5 py-3 text-right">
                  {editingCopart !== t.id && (
                    <button
                      onClick={() => {
                        setEditingCopart(t.id);
                        setPercEmpresa(t.coparticipacao ? String(Number(t.coparticipacao.percentualEmpresa)) : '');
                        setPercColab(t.coparticipacao ? String(Number(t.coparticipacao.percentualColab)) : '');
                      }}
                      className="text-xs text-accent hover:underline"
                    >
                      {t.coparticipacao ? 'Editar' : 'Definir'}
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {tipos?.length === 0 && (
              <tr>
                <td colSpan={4} className="px-5 py-6 text-center text-text-tertiary">
                  Nenhum tipo de benefício cadastrado ainda.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

function AcademiaTab() {
  const queryClient = useQueryClient();
  const [nome, setNome] = useState('');
  const [valorMensalidade, setValorMensalidade] = useState('');

  const { data: convenios } = useQuery({
    queryKey: ['dp', 'benefits', 'convenios-academia'],
    queryFn: async () => (await api.get<ConvenioAcademia[]>('/dp/benefits/convenios-academia')).data,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['dp', 'benefits', 'convenios-academia'] });

  const create = useMutation({
    mutationFn: async () => api.post('/dp/benefits/convenios-academia', { nome, valorMensalidade: Number(valorMensalidade) }),
    onSuccess: () => {
      invalidate();
      setNome('');
      setValorMensalidade('');
    },
  });

  const remove = useMutation({
    mutationFn: async (id: string) => api.delete(`/dp/benefits/convenios-academia/${id}`),
    onSuccess: invalidate,
  });

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <form
          className="flex flex-wrap items-end gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            create.mutate();
          }}
        >
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="text-text-secondary">Convênio</span>
            <input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Smart Fit, Bio Ritmo…" required className="rounded-[10px] border border-border-strong bg-surface px-3 py-2" />
          </label>
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="text-text-secondary">Mensalidade</span>
            <input
              type="number"
              min={0}
              step="0.01"
              value={valorMensalidade}
              onChange={(e) => setValorMensalidade(e.target.value)}
              required
              className="w-32 rounded-[10px] border border-border-strong bg-surface px-3 py-2"
            />
          </label>
          <Button type="submit" disabled={create.isPending}>
            Adicionar convênio
          </Button>
        </form>
      </Card>

      <Card className="p-0">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-divider text-left text-text-tertiary">
              <th className="px-5 py-3 font-medium">Convênio</th>
              <th className="px-5 py-3 font-medium">Mensalidade</th>
              <th className="px-5 py-3 font-medium" />
            </tr>
          </thead>
          <tbody>
            {convenios?.map((c) => (
              <tr key={c.id} className="border-b border-divider last:border-0">
                <td className="px-5 py-3 font-medium">{c.nome}</td>
                <td className="px-5 py-3">{formatBRL(Number(c.valorMensalidade))}</td>
                <td className="px-5 py-3 text-right">
                  <button onClick={() => remove.mutate(c.id)} className="text-xs text-danger hover:underline">
                    Excluir
                  </button>
                </td>
              </tr>
            ))}
            {convenios?.length === 0 && (
              <tr>
                <td colSpan={3} className="px-5 py-6 text-center text-text-tertiary">
                  Nenhum convênio cadastrado ainda.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

function SaudeTab() {
  const queryClient = useQueryClient();
  const [nome, setNome] = useState('');
  const [operadora, setOperadora] = useState('');
  const [openPlanoId, setOpenPlanoId] = useState<string | null>(null);
  const [idadeMin, setIdadeMin] = useState('');
  const [idadeMax, setIdadeMax] = useState('');
  const [valorFaixa, setValorFaixa] = useState('');

  const { data: planos } = useQuery({
    queryKey: ['dp', 'benefits', 'planos-saude'],
    queryFn: async () => (await api.get<PlanoSaude[]>('/dp/benefits/planos-saude')).data,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['dp', 'benefits', 'planos-saude'] });

  const create = useMutation({
    mutationFn: async () => api.post('/dp/benefits/planos-saude', { nome, operadora: operadora || undefined }),
    onSuccess: () => {
      invalidate();
      setNome('');
      setOperadora('');
    },
  });

  const removePlano = useMutation({
    mutationFn: async (id: string) => api.delete(`/dp/benefits/planos-saude/${id}`),
    onSuccess: invalidate,
  });

  const addFaixa = useMutation({
    mutationFn: async (planoId: string) =>
      api.post(`/dp/benefits/planos-saude/${planoId}/faixas`, {
        idadeMin: Number(idadeMin),
        idadeMax: Number(idadeMax),
        valor: Number(valorFaixa),
      }),
    onSuccess: () => {
      invalidate();
      setIdadeMin('');
      setIdadeMax('');
      setValorFaixa('');
    },
  });

  const removeFaixa = useMutation({
    mutationFn: async (vars: { planoId: string; faixaId: string }) =>
      api.delete(`/dp/benefits/planos-saude/${vars.planoId}/faixas/${vars.faixaId}`),
    onSuccess: invalidate,
  });

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <form
          className="flex flex-wrap items-end gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            create.mutate();
          }}
        >
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="text-text-secondary">Plano</span>
            <input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Executivo, Empresarial…" required className="rounded-[10px] border border-border-strong bg-surface px-3 py-2" />
          </label>
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="text-text-secondary">Operadora</span>
            <input value={operadora} onChange={(e) => setOperadora(e.target.value)} placeholder="Unimed, SulAmérica…" className="rounded-[10px] border border-border-strong bg-surface px-3 py-2" />
          </label>
          <Button type="submit" disabled={create.isPending}>
            Adicionar plano
          </Button>
        </form>
      </Card>

      <div className="flex flex-col gap-3">
        {planos?.map((p) => (
          <Card key={p.id} className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="font-medium">{p.nome}</span>
                {p.operadora && <span className="text-sm text-text-tertiary"> · {p.operadora}</span>}
              </div>
              <div className="flex items-center gap-3">
                <button onClick={() => setOpenPlanoId((id) => (id === p.id ? null : p.id))} className="text-xs text-accent hover:underline">
                  {openPlanoId === p.id ? 'Fechar faixas etárias' : 'Faixas etárias'}
                </button>
                <button onClick={() => removePlano.mutate(p.id)} className="text-xs text-danger hover:underline">
                  Excluir
                </button>
              </div>
            </div>

            {openPlanoId === p.id && (
              <div className="flex flex-col gap-3 border-t border-divider pt-3">
                <ul className="flex flex-col gap-1.5 text-sm">
                  {p.faixasEtarias.map((f) => (
                    <li key={f.id} className="flex items-center justify-between">
                      <span>
                        {f.idadeMin} a {f.idadeMax} anos
                      </span>
                      <span className="flex items-center gap-3">
                        <span className="font-medium">{formatBRL(Number(f.valor))}</span>
                        <button
                          onClick={() => removeFaixa.mutate({ planoId: p.id, faixaId: f.id })}
                          className="text-xs text-danger hover:underline"
                        >
                          remover
                        </button>
                      </span>
                    </li>
                  ))}
                  {p.faixasEtarias.length === 0 && <p className="text-text-tertiary">Nenhuma faixa etária cadastrada.</p>}
                </ul>
                <form
                  className="flex flex-wrap items-end gap-2"
                  onSubmit={(e) => {
                    e.preventDefault();
                    addFaixa.mutate(p.id);
                  }}
                >
                  <input type="number" min={0} placeholder="Idade mín." value={idadeMin} onChange={(e) => setIdadeMin(e.target.value)} required className="w-28 rounded-[10px] border border-border-strong bg-surface px-2 py-1.5 text-sm" />
                  <input type="number" min={0} placeholder="Idade máx." value={idadeMax} onChange={(e) => setIdadeMax(e.target.value)} required className="w-28 rounded-[10px] border border-border-strong bg-surface px-2 py-1.5 text-sm" />
                  <input type="number" min={0} step="0.01" placeholder="Valor" value={valorFaixa} onChange={(e) => setValorFaixa(e.target.value)} required className="w-28 rounded-[10px] border border-border-strong bg-surface px-2 py-1.5 text-sm" />
                  <Button type="submit" variant="secondary" disabled={addFaixa.isPending}>
                    Adicionar faixa
                  </Button>
                </form>
              </div>
            )}
          </Card>
        ))}
        {planos?.length === 0 && <p className="text-sm text-text-tertiary">Nenhum plano de saúde cadastrado ainda.</p>}
      </div>
    </div>
  );
}

function FeriadosTab() {
  const queryClient = useQueryClient();
  const [data, setData] = useState('');
  const [nome, setNome] = useState('');
  const [abrangencia, setAbrangencia] = useState<Feriado['abrangencia']>('NACIONAL');
  const [uf, setUf] = useState('');
  const [municipioIbge, setMunicipioIbge] = useState('');

  const { data: feriados } = useQuery({
    queryKey: ['dp', 'benefits', 'feriados'],
    queryFn: async () => (await api.get<Feriado[]>('/dp/benefits/feriados')).data,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['dp', 'benefits', 'feriados'] });

  const create = useMutation({
    mutationFn: async () =>
      api.post('/dp/benefits/feriados', {
        data,
        nome,
        abrangencia,
        uf: abrangencia !== 'NACIONAL' ? uf || undefined : undefined,
        municipioIbge: abrangencia === 'MUNICIPAL' ? municipioIbge || undefined : undefined,
      }),
    onSuccess: () => {
      invalidate();
      setData('');
      setNome('');
      setUf('');
      setMunicipioIbge('');
    },
  });

  const remove = useMutation({
    mutationFn: async (id: string) => api.delete(`/dp/benefits/feriados/${id}`),
    onSuccess: invalidate,
  });

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <p className="mb-3 text-xs text-text-tertiary">
          Usados para calcular dias úteis na apuração de VA/VR — cadastre pelo menos os feriados nacionais do ano.
        </p>
        <form
          className="flex flex-wrap items-end gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            create.mutate();
          }}
        >
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="text-text-secondary">Data</span>
            <input type="date" value={data} onChange={(e) => setData(e.target.value)} required className="rounded-[10px] border border-border-strong bg-surface px-3 py-2" />
          </label>
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="text-text-secondary">Nome</span>
            <input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Independência…" required className="rounded-[10px] border border-border-strong bg-surface px-3 py-2" />
          </label>
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="text-text-secondary">Abrangência</span>
            <select
              value={abrangencia}
              onChange={(e) => setAbrangencia(e.target.value as Feriado['abrangencia'])}
              className="rounded-[10px] border border-border-strong bg-surface px-3 py-2"
            >
              {(Object.keys(ABRANGENCIA_LABEL) as Feriado['abrangencia'][]).map((a) => (
                <option key={a} value={a}>
                  {ABRANGENCIA_LABEL[a]}
                </option>
              ))}
            </select>
          </label>
          {abrangencia !== 'NACIONAL' && (
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="text-text-secondary">UF</span>
              <input value={uf} onChange={(e) => setUf(e.target.value.toUpperCase().slice(0, 2))} required className="w-20 rounded-[10px] border border-border-strong bg-surface px-3 py-2" />
            </label>
          )}
          {abrangencia === 'MUNICIPAL' && (
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="text-text-secondary">Município</span>
              <input value={municipioIbge} onChange={(e) => setMunicipioIbge(e.target.value)} placeholder="Nome ou código IBGE" required className="rounded-[10px] border border-border-strong bg-surface px-3 py-2" />
            </label>
          )}
          <Button type="submit" disabled={create.isPending}>
            Adicionar feriado
          </Button>
        </form>
      </Card>

      <Card className="p-0">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-divider text-left text-text-tertiary">
              <th className="px-5 py-3 font-medium">Data</th>
              <th className="px-5 py-3 font-medium">Nome</th>
              <th className="px-5 py-3 font-medium">Abrangência</th>
              <th className="px-5 py-3 font-medium" />
            </tr>
          </thead>
          <tbody>
            {feriados?.map((f) => (
              <tr key={f.id} className="border-b border-divider last:border-0">
                <td className="px-5 py-3">{formatDate(f.data)}</td>
                <td className="px-5 py-3 font-medium">{f.nome}</td>
                <td className="px-5 py-3">
                  <Badge tone="blue">
                    {ABRANGENCIA_LABEL[f.abrangencia]}
                    {f.uf ? ` · ${f.uf}` : ''}
                    {f.municipioIbge ? ` · ${f.municipioIbge}` : ''}
                  </Badge>
                </td>
                <td className="px-5 py-3 text-right">
                  <button onClick={() => remove.mutate(f.id)} className="text-xs text-danger hover:underline">
                    Excluir
                  </button>
                </td>
              </tr>
            ))}
            {feriados?.length === 0 && (
              <tr>
                <td colSpan={4} className="px-5 py-6 text-center text-text-tertiary">
                  Nenhum feriado cadastrado ainda.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

interface ApuracaoItem {
  id: string;
  competencia: string;
  valorEmpresa: string;
  valorColaborador: string;
  valorTotal: string;
  employee: { id: string; nome: string; matricula: string; departamento: string };
  beneficioTipo: { id: string; nome: string; categoria: BeneficioTipo['categoria'] };
}

function mesAtual() {
  const hoje = new Date();
  return `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}`;
}

function ApuracaoTab() {
  const queryClient = useQueryClient();
  const [competencia, setCompetencia] = useState(mesAtual());

  const { data: itens, isLoading } = useQuery({
    queryKey: ['dp', 'benefits', 'apuracao', competencia],
    queryFn: async () => (await api.get<ApuracaoItem[]>('/dp/benefits/apuracao', { params: { competencia } })).data,
  });

  const calcular = useMutation({
    mutationFn: async () => api.post('/dp/benefits/apuracao/calcular', { competencia }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['dp', 'benefits', 'apuracao', competencia] }),
  });

  const totais = (itens ?? []).reduce(
    (acc, i) => ({
      empresa: acc.empresa + Number(i.valorEmpresa),
      colaborador: acc.colaborador + Number(i.valorColaborador),
      total: acc.total + Number(i.valorTotal),
    }),
    { empresa: 0, colaborador: 0, total: 0 },
  );

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <form
          className="flex flex-wrap items-end gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            calcular.mutate();
          }}
        >
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="text-text-secondary">Competência</span>
            <input
              type="month"
              value={competencia}
              onChange={(e) => setCompetencia(e.target.value)}
              required
              className="rounded-[10px] border border-border-strong bg-surface px-3 py-2"
            />
          </label>
          <Button type="submit" disabled={calcular.isPending}>
            {calcular.isPending ? 'Calculando…' : 'Calcular apuração'}
          </Button>
          {calcular.isSuccess && (
            <span className="text-sm text-text-secondary">
              {calcular.data.data.colaboradoresProcessados} colaboradores processados, {calcular.data.data.itensApurados} itens apurados.
            </span>
          )}
        </form>
        <p className="mt-3 text-xs text-text-tertiary">
          Recalcula com base nas adesões ativas, feriados cadastrados e férias/afastamentos da competência. Pode rodar de novo quantas vezes precisar — o resultado anterior é substituído.
        </p>
      </Card>

      <Card className="p-0">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-divider text-left text-text-tertiary">
              <th className="px-5 py-3 font-medium">Colaborador</th>
              <th className="px-5 py-3 font-medium">Benefício</th>
              <th className="px-5 py-3 font-medium">Empresa</th>
              <th className="px-5 py-3 font-medium">Colaborador</th>
              <th className="px-5 py-3 font-medium">Total</th>
            </tr>
          </thead>
          <tbody>
            {itens?.map((i) => (
              <tr key={i.id} className="border-b border-divider last:border-0">
                <td className="px-5 py-3">
                  <div className="font-medium">{i.employee.nome}</div>
                  <div className="text-xs text-text-tertiary">{i.employee.departamento}</div>
                </td>
                <td className="px-5 py-3">
                  <Badge tone="blue">{i.beneficioTipo.nome}</Badge>
                </td>
                <td className="px-5 py-3">{formatBRL(Number(i.valorEmpresa))}</td>
                <td className="px-5 py-3">{formatBRL(Number(i.valorColaborador))}</td>
                <td className="px-5 py-3 font-medium">{formatBRL(Number(i.valorTotal))}</td>
              </tr>
            ))}
            {!isLoading && itens?.length === 0 && (
              <tr>
                <td colSpan={5} className="px-5 py-6 text-center text-text-tertiary">
                  Nenhuma apuração para essa competência ainda. Clique em &quot;Calcular apuração&quot;.
                </td>
              </tr>
            )}
          </tbody>
          {itens && itens.length > 0 && (
            <tfoot>
              <tr className="border-t border-divider font-medium">
                <td className="px-5 py-3" colSpan={2}>
                  Total
                </td>
                <td className="px-5 py-3">{formatBRL(totais.empresa)}</td>
                <td className="px-5 py-3">{formatBRL(totais.colaborador)}</td>
                <td className="px-5 py-3">{formatBRL(totais.total)}</td>
              </tr>
            </tfoot>
          )}
        </table>
      </Card>
    </div>
  );
}
