'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { Button, Card } from '@/components/ui';

interface TenantUser {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: string;
}

interface Company {
  id: string;
  slug: string;
  name: string;
  nomeFantasia: string | null;
  logoUrl: string | null;
  current: boolean;
}

const ROLES = ['ADMIN', 'RH_GENERALISTA', 'GESTOR_AREA', 'COLABORADOR', 'COMPLIANCE', 'COMITE_ETICA', 'PSICOLOGIA'] as const;
const ROLE_LABEL: Record<string, string> = {
  ADMIN: 'Administrador',
  RH_GENERALISTA: 'RH Generalista',
  GESTOR_AREA: 'Gestor de área',
  COLABORADOR: 'Colaborador',
  COMPLIANCE: 'Compliance',
  COMITE_ETICA: 'Comitê de ética',
  PSICOLOGIA: 'Psicologia',
};

const OUTROS_CADASTROS = [
  { label: 'Colaboradores', descricao: 'Cadastro dos colaboradores', href: '/gestao-de-pessoas/colaboradores' },
  { label: 'Tabela de cargos', descricao: 'Cargos, CBO e faixas salariais', href: '/dp/cargos' },
  { label: 'Departamentos', descricao: 'Setores da empresa', href: '/dp/departamentos' },
  { label: 'Benefícios', descricao: 'Catálogo de benefícios oferecidos', href: '/dp/beneficios' },
  { label: 'CCT/Convenções', descricao: 'Convenções coletivas de trabalho', href: '/dp/cct' },
  { label: 'Prazos trabalhistas', descricao: 'Obrigações e prazos legais', href: '/dp/prazos' },
  { label: 'Checklist de admissão', descricao: 'Etapas e documentos por filial', href: '/cadastros/checklist-admissao' },
  { label: 'Checklist de demissão', descricao: 'Etapas obrigatórias no desligamento', href: '/cadastros/checklist-desligamento' },
];

export default function ConfiguracoesCadastrosPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  // --- Perfis de usuário ---
  const [showNewUser, setShowNewUser] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<(typeof ROLES)[number]>('COLABORADOR');

  const { data: users } = useQuery({
    queryKey: ['tenant', 'users'],
    queryFn: async () => (await api.get<TenantUser[]>('/tenant/users')).data,
  });

  const updateRole = useMutation({
    mutationFn: async (vars: { id: string; role: string }) => api.patch(`/tenant/users/${vars.id}/role`, { role: vars.role }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tenant', 'users'] }),
  });

  const createUser = useMutation({
    mutationFn: async () => api.post('/tenant/users', { name, email, password, role }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenant', 'users'] });
      setShowNewUser(false);
      setName('');
      setEmail('');
      setPassword('');
    },
  });

  // --- Empresas (multi-tenant) ---
  const [showNewCompany, setShowNewCompany] = useState(false);
  const [companyName, setCompanyName] = useState('');
  const [companyError, setCompanyError] = useState('');

  const { data: companies } = useQuery({
    queryKey: ['auth', 'companies'],
    queryFn: async () => (await api.get<Company[]>('/auth/companies')).data,
  });

  const createCompany = useMutation({
    mutationFn: async () => (await api.post<{ tenantSlug: string }>('/auth/companies', { companyName })).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['auth', 'companies'] });
      setShowNewCompany(false);
      setCompanyName('');
      setCompanyError('');
    },
    onError: (err: unknown) => {
      const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setCompanyError(message ?? 'Não foi possível cadastrar a empresa.');
    },
  });

  const switchCompany = useMutation({
    mutationFn: async (slug: string) => api.post('/auth/switch-tenant', { tenantSlug: slug }),
    onSuccess: () => {
      queryClient.clear();
      router.replace('/painel');
    },
  });

  return (
    <div className="flex flex-col gap-6">
      <Card className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold">Empresas</h3>
            <p className="text-xs text-text-secondary">
              Empresas onde você tem uma conta com este e-mail. Ao cadastrar uma nova, ela usa o mesmo e-mail e senha desta conta.
            </p>
          </div>
          <Button variant="secondary" onClick={() => setShowNewCompany((s) => !s)}>
            {showNewCompany ? 'Cancelar' : 'Nova empresa'}
          </Button>
        </div>

        {showNewCompany && (
          <form
            className="flex flex-wrap items-end gap-3 rounded-[10px] border border-border p-3"
            onSubmit={(e) => {
              e.preventDefault();
              createCompany.mutate();
            }}
          >
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="text-text-secondary">Nome da empresa</span>
              <input
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                required
                minLength={2}
                className="rounded-[10px] border border-border-strong bg-surface px-3 py-2 text-sm"
              />
            </label>
            <Button type="submit" disabled={createCompany.isPending}>
              {createCompany.isPending ? 'Criando…' : 'Criar empresa'}
            </Button>
            {companyError && <p className="text-sm text-danger">{companyError}</p>}
          </form>
        )}

        <div className="flex flex-col gap-2">
          {companies?.map((c) => (
            <Link
              key={c.id}
              href={`/configuracoes/cadastros/empresas/${c.id}`}
              className="flex items-center justify-between rounded-[10px] border border-border px-3 py-2.5 transition hover:border-accent"
            >
              <div className="flex items-center gap-2.5">
                {c.logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={c.logoUrl} alt="" className="h-7 w-7 rounded-full object-cover" />
                ) : (
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-tint-blue text-xs font-semibold">
                    {(c.nomeFantasia || c.name)[0]?.toUpperCase()}
                  </span>
                )}
                <div>
                  <div className="text-sm font-medium">{c.nomeFantasia || c.name}</div>
                  <div className="text-xs text-text-tertiary">{c.slug}</div>
                </div>
              </div>
              {c.current ? (
                <span className="text-xs font-semibold text-accent">Empresa atual</span>
              ) : (
                <Button
                  variant="secondary"
                  onClick={(e) => { e.preventDefault(); switchCompany.mutate(c.slug); }}
                  disabled={switchCompany.isPending}
                >
                  Trocar para esta
                </Button>
              )}
            </Link>
          ))}
          {companies?.length === 0 && <p className="text-sm text-text-tertiary">Nenhuma empresa encontrada.</p>}
        </div>
      </Card>

      <Card className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">Perfis de usuário</h3>
          <Button variant="secondary" onClick={() => setShowNewUser((s) => !s)}>
            {showNewUser ? 'Cancelar' : 'Novo usuário'}
          </Button>
        </div>

        {showNewUser && (
          <form
            className="flex flex-wrap items-end gap-3 rounded-[10px] border border-border p-3"
            onSubmit={(e) => {
              e.preventDefault();
              createUser.mutate();
            }}
          >
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome" required className="rounded-[10px] border border-border-strong bg-surface px-3 py-2 text-sm" />
            <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="E-mail" required className="rounded-[10px] border border-border-strong bg-surface px-3 py-2 text-sm" />
            <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" placeholder="Senha inicial" required minLength={8} className="rounded-[10px] border border-border-strong bg-surface px-3 py-2 text-sm" />
            <select value={role} onChange={(e) => setRole(e.target.value as typeof role)} className="rounded-[10px] border border-border-strong bg-surface px-3 py-2 text-sm">
              {ROLES.map((r) => (
                <option key={r} value={r}>{ROLE_LABEL[r]}</option>
              ))}
            </select>
            <Button type="submit" disabled={createUser.isPending}>
              Criar
            </Button>
          </form>
        )}

        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-divider text-left text-text-tertiary">
              <th className="py-2 font-medium">Nome</th>
              <th className="py-2 font-medium">E-mail</th>
              <th className="py-2 font-medium">Perfil</th>
            </tr>
          </thead>
          <tbody>
            {users?.map((u) => (
              <tr key={u.id} className="border-b border-divider last:border-0">
                <td className="py-2.5 font-medium">{u.name}</td>
                <td className="py-2.5 text-text-secondary">{u.email}</td>
                <td className="py-2.5">
                  <select
                    value={u.role}
                    onChange={(e) => updateRole.mutate({ id: u.id, role: e.target.value })}
                    className="rounded-[8px] border border-border-strong bg-surface px-2 py-1 text-xs"
                  >
                    {ROLES.map((r) => (
                      <option key={r} value={r}>{ROLE_LABEL[r]}</option>
                    ))}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <div className="flex flex-col gap-3">
        <h3 className="text-xs font-semibold uppercase tracking-[0.06em] text-text-tertiary">Outros cadastros</h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {OUTROS_CADASTROS.map((item) => (
            <Link key={item.label} href={item.href}>
              <Card className="flex h-full flex-col gap-1 transition hover:border-accent">
                <span className="text-sm font-semibold text-text">{item.label}</span>
                <span className="text-xs text-text-secondary">{item.descricao}</span>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
