'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { useAuth } from '@/lib/auth-context';
import { Badge, Button, Drawer } from '@/components/ui';

const ROLE_LABEL: Record<string, string> = {
  ADMIN: 'Administrador',
  RH_GENERALISTA: 'RH Generalista',
  GESTOR_AREA: 'Gestor de área',
  COLABORADOR: 'Colaborador',
  COMPLIANCE: 'Compliance',
  COMITE_ETICA: 'Comitê de ética',
  PSICOLOGIA: 'Psicologia',
};

const PRIORIDADE_TONE = { BAIXA: 'grey', MEDIA: 'blue', ALTA: 'amber', CRITICA: 'red' } as const;

interface SearchResult {
  colaboradores: { id: string; nome: string; matricula: string; cargo: string; departamento: string }[];
}

interface Task {
  id: string;
  modulo: string;
  titulo: string;
  prioridade: 'BAIXA' | 'MEDIA' | 'ALTA' | 'CRITICA';
  detalhes: { href?: string } | null;
}

function useTheme() {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    const stored = (localStorage.getItem('elos-theme') as 'light' | 'dark' | null) ?? null;
    const initial = stored ?? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    setTheme(initial);
    document.documentElement.setAttribute('data-theme', initial);
  }, []);

  const toggle = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('elos-theme', next);
  };

  return { theme, toggle };
}

export function Header({ eyebrow, title }: { eyebrow: string; title: string }) {
  const { user } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { theme, toggle: toggleTheme } = useTheme();

  const [searchTerm, setSearchTerm] = useState('');
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showAccountMenu, setShowAccountMenu] = useState(false);
  const [showPasswordDrawer, setShowPasswordDrawer] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [showSwitchDrawer, setShowSwitchDrawer] = useState(false);
  const [switchSlug, setSwitchSlug] = useState('');
  const [switchError, setSwitchError] = useState('');

  const { data: searchData } = useQuery({
    queryKey: ['search', searchTerm],
    queryFn: async () => (await api.get<SearchResult>('/search', { params: { q: searchTerm } })).data,
    enabled: searchTerm.trim().length >= 2,
  });

  const { data: tasks } = useQuery({
    queryKey: ['dashboard', 'tasks'],
    queryFn: async () => (await api.get<Task[]>('/dashboard/tasks')).data,
  });

  const logout = useMutation({
    mutationFn: async () => api.post('/auth/logout'),
    onSuccess: async () => {
      queryClient.clear();
      router.replace('/login');
    },
  });

  const changePassword = useMutation({
    mutationFn: async () => api.post('/auth/change-password', { currentPassword, newPassword }),
    onSuccess: () => {
      setPasswordSuccess(true);
      setPasswordError('');
      setCurrentPassword('');
      setNewPassword('');
    },
    onError: () => setPasswordError('Não foi possível trocar a senha. Confira a senha atual.'),
  });

  const switchTenant = useMutation({
    mutationFn: async () => api.post('/auth/switch-tenant', { tenantSlug: switchSlug }),
    onSuccess: () => {
      queryClient.clear();
      setShowSwitchDrawer(false);
      setSwitchSlug('');
      setSwitchError('');
      router.replace('/painel');
    },
    onError: () => setSwitchError('Você não tem uma conta nessa empresa.'),
  });

  const initials = user?.name
    ?.split(' ')
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase();

  const criticalCount = tasks?.filter((t) => t.prioridade === 'ALTA' || t.prioridade === 'CRITICA').length ?? 0;

  return (
    <header className="flex items-center justify-between gap-4 border-b border-divider bg-page-bg px-8 py-5">
      <div>
        <div className="text-[10.5px] font-semibold uppercase tracking-[0.06em] text-text-tertiary">{eyebrow}</div>
        <h1 className="text-xl font-semibold text-text">{title}</h1>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative">
          <input
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setShowSearchResults(true);
            }}
            onFocus={() => setShowSearchResults(true)}
            placeholder="Buscar colaborador…"
            className="w-64 rounded-full border border-border-strong bg-surface px-4 py-2 text-sm"
          />
          {showSearchResults && searchTerm.trim().length >= 2 && (
            <div className="absolute right-0 z-40 mt-1 w-80 rounded-[10px] border border-border bg-surface shadow-lg">
              <ul className="max-h-72 overflow-y-auto py-1">
                {searchData?.colaboradores.map((c) => (
                  <li key={c.id}>
                    <Link
                      href={`/gestao-de-pessoas/colaboradores/${c.id}`}
                      onClick={() => {
                        setShowSearchResults(false);
                        setSearchTerm('');
                      }}
                      className="block px-3 py-2 text-sm hover:bg-surface-alt"
                    >
                      <div className="font-medium">{c.nome}</div>
                      <div className="text-xs text-text-tertiary">{c.cargo} · {c.departamento}</div>
                    </Link>
                  </li>
                ))}
                {searchData?.colaboradores.length === 0 && (
                  <li className="px-3 py-2 text-sm text-text-tertiary">Nenhum colaborador encontrado.</li>
                )}
              </ul>
            </div>
          )}
        </div>

        <div className="relative">
          <button
            onClick={() => {
              setShowNotifications((s) => !s);
              setShowAccountMenu(false);
            }}
            className="relative flex h-9 w-9 items-center justify-center rounded-full border border-border-strong bg-surface text-text-secondary hover:text-text"
            aria-label="Alertas"
          >
            🔔
            {criticalCount > 0 && (
              <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-danger text-[10px] font-semibold text-white">
                {criticalCount}
              </span>
            )}
          </button>
          {showNotifications && (
            <div className="absolute right-0 z-40 mt-1 w-80 rounded-[10px] border border-border bg-surface shadow-lg">
              <div className="border-b border-divider px-3 py-2 text-xs font-semibold uppercase tracking-[0.06em] text-text-tertiary">
                Alertas ({tasks?.length ?? 0})
              </div>
              <ul className="max-h-80 overflow-y-auto py-1">
                {tasks?.map((t) => {
                  const href = t.detalhes?.href;
                  const content = (
                    <>
                      <Badge tone={PRIORIDADE_TONE[t.prioridade]}>{t.modulo}</Badge>
                      <span className="flex-1 text-sm">{t.titulo}</span>
                    </>
                  );
                  return (
                    <li key={t.id}>
                      {href ? (
                        <Link href={href} onClick={() => setShowNotifications(false)} className="flex items-center gap-2 px-3 py-2 hover:bg-surface-alt">
                          {content}
                        </Link>
                      ) : (
                        <div className="flex items-center gap-2 px-3 py-2">{content}</div>
                      )}
                    </li>
                  );
                })}
                {tasks?.length === 0 && <li className="px-3 py-2 text-sm text-text-tertiary">Nenhum alerta no momento.</li>}
              </ul>
            </div>
          )}
        </div>

        <div className="relative">
          <button
            onClick={() => {
              setShowAccountMenu((s) => !s);
              setShowNotifications(false);
            }}
            title={user?.email}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-accent text-sm font-semibold text-on-accent"
          >
            {initials}
          </button>
          {showAccountMenu && (
            <div className="absolute right-0 z-40 mt-1 w-64 rounded-[10px] border border-border bg-surface shadow-lg">
              <div className="border-b border-divider px-4 py-3">
                <div className="font-medium">{user?.name}</div>
                <div className="text-xs text-text-tertiary">{ROLE_LABEL[user?.role ?? ''] ?? user?.role}</div>
              </div>
              <button
                onClick={toggleTheme}
                className="flex w-full items-center justify-between px-4 py-2.5 text-left text-sm hover:bg-surface-alt"
              >
                <span>Alternar tema</span>
                <span className="text-text-tertiary">{theme === 'dark' ? 'Escuro' : 'Claro'}</span>
              </button>
              <button
                onClick={() => {
                  setShowAccountMenu(false);
                  setShowPasswordDrawer(true);
                  setPasswordSuccess(false);
                }}
                className="block w-full px-4 py-2.5 text-left text-sm hover:bg-surface-alt"
              >
                Trocar senha
              </button>
              <button
                onClick={() => {
                  setShowAccountMenu(false);
                  setShowSwitchDrawer(true);
                  setSwitchError('');
                  setSwitchSlug('');
                }}
                className="block w-full px-4 py-2.5 text-left text-sm hover:bg-surface-alt"
              >
                Trocar de empresa
              </button>
              <button
                onClick={() => logout.mutate()}
                className="block w-full rounded-b-[10px] px-4 py-2.5 text-left text-sm text-danger hover:bg-danger/10"
              >
                Sair
              </button>
            </div>
          )}
        </div>
      </div>

      <Drawer open={showPasswordDrawer} onClose={() => setShowPasswordDrawer(false)} title="Trocar senha">
        {passwordSuccess ? (
          <p className="text-sm text-success">Senha alterada com sucesso.</p>
        ) : (
          <form
            className="flex flex-col gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              changePassword.mutate();
            }}
          >
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="text-text-secondary">Senha atual</span>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
                className="rounded-[10px] border border-border-strong bg-surface px-3 py-2"
              />
            </label>
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="text-text-secondary">Nova senha</span>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={8}
                className="rounded-[10px] border border-border-strong bg-surface px-3 py-2"
              />
            </label>
            {passwordError && <p className="text-sm text-danger">{passwordError}</p>}
            <Button type="submit" disabled={changePassword.isPending} className="self-start">
              Salvar nova senha
            </Button>
          </form>
        )}
      </Drawer>

      <Drawer open={showSwitchDrawer} onClose={() => setShowSwitchDrawer(false)} title="Trocar de empresa">
        <form
          className="flex flex-col gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            switchTenant.mutate();
          }}
        >
          <p className="text-sm text-text-secondary">
            Informe o identificador (slug) da outra empresa onde você tem uma conta com este mesmo e-mail.
          </p>
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="text-text-secondary">Empresa (slug)</span>
            <input
              value={switchSlug}
              onChange={(e) => setSwitchSlug(e.target.value)}
              required
              className="rounded-[10px] border border-border-strong bg-surface px-3 py-2"
            />
          </label>
          {switchError && <p className="text-sm text-danger">{switchError}</p>}
          <Button type="submit" disabled={switchTenant.isPending} className="self-start">
            Trocar
          </Button>
        </form>
      </Drawer>
    </header>
  );
}
