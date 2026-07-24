'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { Badge, Button, Card } from '@/components/ui';

interface DocumentRequirement {
  id: string;
  nome: string;
  categoria: string;
  obrigatorio: boolean;
  ativo: boolean;
  validadeDias: number | null;
  aplicaTipoContrato: string[];
  aplicaDepartamento: string[];
}

function csvToList(value: string): string[] {
  return value.split(',').map((v) => v.trim()).filter(Boolean);
}

function DocumentRequirementsConfig() {
  const queryClient = useQueryClient();
  const { data: requirements } = useQuery({
    queryKey: ['rh', 'documents', 'requirements'],
    queryFn: async () => (await api.get<DocumentRequirement[]>('/rh/documents/requirements')).data,
  });

  const [nome, setNome] = useState('');
  const [categoria, setCategoria] = useState('');
  const [obrigatorio, setObrigatorio] = useState(true);
  const [validadeDias, setValidadeDias] = useState('');
  const [aplicaTipoContrato, setAplicaTipoContrato] = useState<string[]>([]);
  const [aplicaDepartamento, setAplicaDepartamento] = useState('');

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['rh', 'documents', 'requirements'] });

  const create = useMutation({
    mutationFn: async () =>
      api.post('/rh/documents/requirements', {
        nome,
        categoria,
        obrigatorio,
        validadeDias: validadeDias ? Number(validadeDias) : undefined,
        aplicaTipoContrato,
        aplicaDepartamento: csvToList(aplicaDepartamento),
      }),
    onSuccess: () => {
      invalidate();
      setNome('');
      setCategoria('');
      setValidadeDias('');
      setAplicaTipoContrato([]);
      setAplicaDepartamento('');
    },
  });

  const toggleAtivo = useMutation({
    mutationFn: async (vars: { id: string; ativo: boolean }) => api.patch(`/rh/documents/requirements/${vars.id}`, { ativo: vars.ativo }),
    onSuccess: invalidate,
  });

  return (
    <Card className="flex flex-col gap-4">
      <div>
        <h3 className="text-sm font-semibold">Documentos obrigatórios</h3>
        <p className="text-xs text-text-tertiary">
          Requisitos aplicados automaticamente aos colaboradores conforme tipo de contrato e/ou departamento (vazio = aplica a todos).
        </p>
      </div>

      <ul className="flex flex-col gap-2">
        {requirements?.map((r) => (
          <li key={r.id} className="flex items-center justify-between rounded-[10px] border border-border p-2.5 text-sm">
            <div>
              <div className="font-medium">
                {r.nome} {!r.obrigatorio && <span className="text-xs text-text-tertiary">(opcional)</span>}
              </div>
              <div className="text-xs text-text-tertiary">
                {r.categoria}
                {r.validadeDias ? ` · válido por ${r.validadeDias} dias` : ' · sem validade'}
                {r.aplicaTipoContrato.length > 0 && ` · ${r.aplicaTipoContrato.join('/')}`}
                {r.aplicaDepartamento.length > 0 && ` · ${r.aplicaDepartamento.join(', ')}`}
              </div>
            </div>
            <label className="flex items-center gap-1.5 text-xs text-text-secondary">
              <input type="checkbox" checked={r.ativo} onChange={(e) => toggleAtivo.mutate({ id: r.id, ativo: e.target.checked })} />
              Ativo
            </label>
          </li>
        ))}
        {requirements?.length === 0 && <p className="text-sm text-text-tertiary">Nenhum requisito configurado ainda.</p>}
      </ul>

      <form
        className="flex flex-wrap items-end gap-3 border-t border-divider pt-3"
        onSubmit={(e) => {
          e.preventDefault();
          create.mutate();
        }}
      >
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="text-text-secondary">Nome</span>
          <input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="ASO Admissional" required className="rounded-[10px] border border-border-strong bg-surface px-3 py-2" />
        </label>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="text-text-secondary">Categoria</span>
          <input value={categoria} onChange={(e) => setCategoria(e.target.value)} placeholder="Saúde, Contratual…" required className="rounded-[10px] border border-border-strong bg-surface px-3 py-2" />
        </label>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="text-text-secondary">Validade (dias)</span>
          <input type="number" min={1} value={validadeDias} onChange={(e) => setValidadeDias(e.target.value)} placeholder="Sem validade" className="w-32 rounded-[10px] border border-border-strong bg-surface px-3 py-2" />
        </label>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="text-text-secondary">Departamentos (opcional)</span>
          <input value={aplicaDepartamento} onChange={(e) => setAplicaDepartamento(e.target.value)} placeholder="Financeiro, Operações…" className="rounded-[10px] border border-border-strong bg-surface px-3 py-2" />
        </label>
        <div className="flex flex-col gap-1.5 text-sm">
          <span className="text-text-secondary">Aplica a</span>
          <div className="flex gap-3 py-2">
            {(['CLT', 'ESTAGIO', 'PJ'] as const).map((tipo) => (
              <label key={tipo} className="flex items-center gap-1.5 text-xs">
                <input
                  type="checkbox"
                  checked={aplicaTipoContrato.includes(tipo)}
                  onChange={(e) =>
                    setAplicaTipoContrato((prev) => (e.target.checked ? [...prev, tipo] : prev.filter((t) => t !== tipo)))
                  }
                />
                {tipo}
              </label>
            ))}
          </div>
        </div>
        <label className="flex items-center gap-1.5 pb-2 text-sm">
          <input type="checkbox" checked={obrigatorio} onChange={(e) => setObrigatorio(e.target.checked)} />
          Obrigatório
        </label>
        <Button type="submit" disabled={create.isPending}>
          Adicionar requisito
        </Button>
      </form>
    </Card>
  );
}

interface Employee {
  id: string;
  matricula: string;
  nome: string;
  cargo: string;
  departamento: string;
  dataAdmissao: string;
  status: 'ATIVO' | 'INATIVO';
  feriasVencimentoAlerta: boolean;
}

interface FilterOptions {
  departamentos: string[];
  cargos: string[];
  filiais: string[];
}

const TENURE_OPTIONS = [
  { label: 'Qualquer tempo de casa', value: '' },
  { label: '1+ ano', value: '1' },
  { label: '3+ anos', value: '3' },
  { label: '5+ anos', value: '5' },
  { label: '10+ anos', value: '10' },
];

export default function ColaboradoresPage() {
  const queryClient = useQueryClient();
  const [nome, setNome] = useState('');
  const [status, setStatus] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [showDocConfig, setShowDocConfig] = useState(false);
  const [departamento, setDepartamento] = useState('');
  const [cargoFiltro, setCargoFiltro] = useState('');
  const [filial, setFilial] = useState('');
  const [tipoContrato, setTipoContrato] = useState('');
  const [admissaoDe, setAdmissaoDe] = useState('');
  const [admissaoAte, setAdmissaoAte] = useState('');
  const [tempoDeCasaMinAnos, setTempoDeCasaMinAnos] = useState('');
  const [feriasVencendo, setFeriasVencendo] = useState(false);

  const [showForm, setShowForm] = useState(false);
  const [novoNome, setNovoNome] = useState('');
  const [cargo, setCargo] = useState('');
  const [novoDepartamento, setNovoDepartamento] = useState('');
  const [dataAdmissao, setDataAdmissao] = useState('');
  const [salario, setSalario] = useState('');
  const [email, setEmail] = useState('');

  const activeFilterCount = [departamento, cargoFiltro, filial, tipoContrato, admissaoDe, admissaoAte, tempoDeCasaMinAnos].filter(Boolean).length + (feriasVencendo ? 1 : 0);

  const filters = {
    nome: nome || undefined,
    status: status || undefined,
    departamento: departamento || undefined,
    cargo: cargoFiltro || undefined,
    filial: filial || undefined,
    tipoContrato: tipoContrato || undefined,
    admissaoDe: admissaoDe || undefined,
    admissaoAte: admissaoAte || undefined,
    tempoDeCasaMinAnos: tempoDeCasaMinAnos || undefined,
    feriasVencendo: feriasVencendo || undefined,
  };

  const { data: employees, isLoading } = useQuery({
    queryKey: ['employees', filters],
    queryFn: async () => (await api.get<Employee[]>('/rh/employees', { params: filters })).data,
  });

  const { data: filterOptions } = useQuery({
    queryKey: ['employees', 'filter-options'],
    queryFn: async () => (await api.get<FilterOptions>('/rh/employees/filter-options')).data,
  });

  const create = useMutation({
    mutationFn: async () =>
      api.post('/rh/employees', {
        nome: novoNome,
        cargo,
        departamento: novoDepartamento,
        dataAdmissao,
        salario: Number(salario),
        email: email || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      setShowForm(false);
      setNovoNome('');
      setCargo('');
      setNovoDepartamento('');
      setDataAdmissao('');
      setSalario('');
      setEmail('');
    },
  });

  const clearFilters = () => {
    setDepartamento('');
    setCargoFiltro('');
    setFilial('');
    setTipoContrato('');
    setAdmissaoDe('');
    setAdmissaoAte('');
    setTempoDeCasaMinAnos('');
    setFeriasVencendo(false);
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex flex-wrap gap-3">
          <input
            placeholder="Buscar por nome…"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            className="rounded-[10px] border border-border-strong bg-surface px-3 py-2 text-sm"
          />
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="rounded-[10px] border border-border-strong bg-surface px-3 py-2 text-sm"
          >
            <option value="">Todos os status</option>
            <option value="ATIVO">Ativo</option>
            <option value="INATIVO">Inativo</option>
          </select>
          <Button variant="secondary" onClick={() => setShowFilters((s) => !s)}>
            Mais filtros{activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}
          </Button>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => setShowDocConfig((s) => !s)}>
            {showDocConfig ? 'Fechar documentos obrigatórios' : 'Documentos obrigatórios'}
          </Button>
          <Button onClick={() => setShowForm((s) => !s)}>{showForm ? 'Cancelar' : 'Novo colaborador'}</Button>
        </div>
      </div>

      {showDocConfig && <DocumentRequirementsConfig />}

      {showFilters && (
        <Card>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="text-text-secondary">Departamento</span>
              <select value={departamento} onChange={(e) => setDepartamento(e.target.value)} className="rounded-[10px] border border-border-strong bg-surface px-3 py-2">
                <option value="">Todos</option>
                {filterOptions?.departamentos.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="text-text-secondary">Cargo</span>
              <select value={cargoFiltro} onChange={(e) => setCargoFiltro(e.target.value)} className="rounded-[10px] border border-border-strong bg-surface px-3 py-2">
                <option value="">Todos</option>
                {filterOptions?.cargos.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="text-text-secondary">Filial</span>
              <select value={filial} onChange={(e) => setFilial(e.target.value)} className="rounded-[10px] border border-border-strong bg-surface px-3 py-2">
                <option value="">Todas</option>
                {filterOptions?.filiais.map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="text-text-secondary">Tipo de contrato</span>
              <select value={tipoContrato} onChange={(e) => setTipoContrato(e.target.value)} className="rounded-[10px] border border-border-strong bg-surface px-3 py-2">
                <option value="">Todos</option>
                <option value="CLT">CLT</option>
                <option value="ESTAGIO">Estágio</option>
                <option value="PJ">PJ</option>
              </select>
            </label>
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="text-text-secondary">Admissão de</span>
              <input type="date" value={admissaoDe} onChange={(e) => setAdmissaoDe(e.target.value)} className="rounded-[10px] border border-border-strong bg-surface px-3 py-2" />
            </label>
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="text-text-secondary">Admissão até</span>
              <input type="date" value={admissaoAte} onChange={(e) => setAdmissaoAte(e.target.value)} className="rounded-[10px] border border-border-strong bg-surface px-3 py-2" />
            </label>
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="text-text-secondary">Tempo de casa</span>
              <select value={tempoDeCasaMinAnos} onChange={(e) => setTempoDeCasaMinAnos(e.target.value)} className="rounded-[10px] border border-border-strong bg-surface px-3 py-2">
                {TENURE_OPTIONS.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex items-end gap-2 pb-2 text-sm">
              <input type="checkbox" checked={feriasVencendo} onChange={(e) => setFeriasVencendo(e.target.checked)} />
              <span className="text-text-secondary">Só com férias vencendo (60 dias)</span>
            </label>
          </div>
          {activeFilterCount > 0 && (
            <button onClick={clearFilters} className="mt-3 text-xs text-accent hover:underline">
              Limpar filtros
            </button>
          )}
        </Card>
      )}

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
              <span className="text-text-secondary">Nome</span>
              <input value={novoNome} onChange={(e) => setNovoNome(e.target.value)} required className="rounded-[10px] border border-border-strong bg-surface px-3 py-2" />
            </label>
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="text-text-secondary">Cargo</span>
              <input value={cargo} onChange={(e) => setCargo(e.target.value)} required className="rounded-[10px] border border-border-strong bg-surface px-3 py-2" />
            </label>
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="text-text-secondary">Departamento</span>
              <input value={novoDepartamento} onChange={(e) => setNovoDepartamento(e.target.value)} required className="rounded-[10px] border border-border-strong bg-surface px-3 py-2" />
            </label>
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="text-text-secondary">Admissão</span>
              <input type="date" value={dataAdmissao} onChange={(e) => setDataAdmissao(e.target.value)} required className="rounded-[10px] border border-border-strong bg-surface px-3 py-2" />
            </label>
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="text-text-secondary">Salário</span>
              <input type="number" value={salario} onChange={(e) => setSalario(e.target.value)} required className="w-32 rounded-[10px] border border-border-strong bg-surface px-3 py-2" />
            </label>
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="text-text-secondary">E-mail</span>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="rounded-[10px] border border-border-strong bg-surface px-3 py-2" />
            </label>
            <Button type="submit" disabled={create.isPending}>
              Salvar
            </Button>
          </form>
        </Card>
      )}

      {isLoading && <p className="text-sm text-text-tertiary">Carregando…</p>}

      <Card className="p-0">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-divider text-left text-text-tertiary">
              <th className="px-5 py-3 font-medium">Matrícula</th>
              <th className="px-5 py-3 font-medium">Colaborador</th>
              <th className="px-5 py-3 font-medium">Cargo</th>
              <th className="px-5 py-3 font-medium">Departamento</th>
              <th className="px-5 py-3 font-medium">Admissão</th>
              <th className="px-5 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {employees?.map((e) => (
              <tr key={e.id} className="border-b border-divider last:border-0 hover:bg-surface-alt">
                <td className="px-5 py-3 text-text-secondary">{e.matricula}</td>
                <td className="px-5 py-3">
                  <Link href={`/gestao-de-pessoas/colaboradores/${e.id}`} className="font-medium">
                    {e.nome}
                  </Link>
                </td>
                <td className="px-5 py-3">{e.cargo}</td>
                <td className="px-5 py-3 text-text-secondary">{e.departamento}</td>
                <td className="px-5 py-3 text-text-secondary">{new Date(e.dataAdmissao).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}</td>
                <td className="px-5 py-3">
                  <Badge tone={e.status === 'ATIVO' ? 'green' : 'grey'}>{e.status === 'ATIVO' ? 'Ativo' : 'Inativo'}</Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {employees?.length === 0 && <p className="py-8 text-center text-sm text-text-tertiary">Nenhum colaborador encontrado.</p>}
      </Card>
    </div>
  );
}
