'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { Button, Card } from '@/components/ui';
import { Header } from '@/components/header';

interface TenantInfo {
  name: string;
  slug: string;
  razaoSocial: string | null;
  cnpj: string | null;
}

interface TenantUser {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: string;
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

export default function ConfiguracoesPage() {
  const queryClient = useQueryClient();
  const [razaoSocial, setRazaoSocial] = useState<string | null>(null);
  const [cnpj, setCnpj] = useState<string | null>(null);
  const [showNewUser, setShowNewUser] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<(typeof ROLES)[number]>('COLABORADOR');

  const { data: tenant } = useQuery({
    queryKey: ['tenant'],
    queryFn: async () => (await api.get<TenantInfo>('/tenant')).data,
  });
  const { data: users } = useQuery({
    queryKey: ['tenant', 'users'],
    queryFn: async () => (await api.get<TenantUser[]>('/tenant/users')).data,
  });

  const [tenantSaved, setTenantSaved] = useState(false);
  const saveTenant = useMutation({
    mutationFn: async () => api.patch('/tenant', { razaoSocial: razaoSocial ?? undefined, cnpj: cnpj ?? undefined }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenant'] });
      setTenantSaved(true);
      setTimeout(() => setTenantSaved(false), 3000);
    },
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

  return (
    <>
      <Header eyebrow="Administração" title="Configurações" />
      <main className="flex-1 overflow-y-auto px-8 py-6">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card className="flex flex-col gap-3">
            <h3 className="text-sm font-semibold">Dados da empresa</h3>
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="text-text-secondary">Razão social</span>
              <input
                value={razaoSocial ?? tenant?.razaoSocial ?? ''}
                onChange={(e) => setRazaoSocial(e.target.value)}
                className="rounded-[10px] border border-border-strong bg-surface px-3 py-2"
              />
            </label>
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="text-text-secondary">CNPJ</span>
              <input
                value={cnpj ?? tenant?.cnpj ?? ''}
                onChange={(e) => setCnpj(e.target.value)}
                className="rounded-[10px] border border-border-strong bg-surface px-3 py-2"
              />
            </label>
            <div className="flex items-center gap-3">
              <Button className="self-start" onClick={() => saveTenant.mutate()} disabled={saveTenant.isPending}>
                {saveTenant.isPending ? 'Salvando…' : 'Salvar'}
              </Button>
              {tenantSaved && <span className="text-sm text-success">Salvo com sucesso.</span>}
              {saveTenant.isError && <span className="text-sm text-danger">Não foi possível salvar.</span>}
            </div>
          </Card>

          <Card className="flex flex-col gap-3">
            <h3 className="text-sm font-semibold">Atalhos</h3>
            <div className="flex flex-col gap-2 text-sm">
              <Link href="/configuracoes/licenca" className="text-accent hover:underline">Licença e plano comercial →</Link>
              <Link href="/gestao-de-pessoas/colaboradores" className="text-accent hover:underline">Documentos obrigatórios (Colaboradores) →</Link>
              <Link href="/gestao-de-pessoas/desligamento" className="text-accent hover:underline">Checklist de desligamento →</Link>
              <Link href="/ferramentas/integracoes" className="text-accent hover:underline">Integrações →</Link>
            </div>
          </Card>

          <Card className="flex flex-col gap-3 lg:col-span-2">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">Usuários e permissões</h3>
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
        </div>
      </main>
    </>
  );
}
