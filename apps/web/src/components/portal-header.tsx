'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { useAuth } from '@/lib/auth-context';
import { Button, Drawer } from '@/components/ui';

const ROLE_LABEL: Record<string, string> = {
  ADMIN: 'Administrador',
  RH_GENERALISTA: 'RH Generalista',
  GESTOR_AREA: 'Gestor de área',
  COLABORADOR: 'Colaborador',
  COMPLIANCE: 'Compliance',
  COMITE_ETICA: 'Comitê de ética',
  PSICOLOGIA: 'Psicologia',
};

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

/**
 * Header exclusivo do Portal do Colaborador -- deliberadamente SEM busca de
 * colaboradores, alertas/tarefas da empresa ou "trocar de empresa" (o
 * `Header` do hub interno consulta endpoints com dado de toda a empresa;
 * aqui o colaborador só pode ver o que é dele mesmo).
 */
export function PortalHeader({ title }: { title: string }) {
  const { user, tenant } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { theme, toggle: toggleTheme } = useTheme();

  const [showAccountMenu, setShowAccountMenu] = useState(false);
  const [showPasswordDrawer, setShowPasswordDrawer] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState(false);

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

  const initials = user?.name
    ?.split(' ')
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase();

  return (
    <header className="flex items-center justify-between gap-4 border-b border-divider bg-page-bg px-8 py-5">
      <div>
        <h1 className="text-xl font-semibold text-text">{title}</h1>
      </div>

      <div className="relative">
        <button
          onClick={() => setShowAccountMenu((s) => !s)}
          title={user?.email}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-accent text-sm font-semibold text-on-accent"
        >
          {initials}
        </button>
        {showAccountMenu && (
          <div className="absolute right-0 z-40 mt-1 w-64 rounded-container border border-border bg-surface shadow-lg">
            <div className="border-b border-divider px-4 py-3">
              <div className="font-medium">{user?.name}</div>
              <div className="text-xs text-text-tertiary">{ROLE_LABEL[user?.role ?? ''] ?? user?.role}</div>
              {(tenant?.nomeFantasia || tenant?.name) && (
                <div className="mt-1 text-xs text-text-tertiary">{tenant?.nomeFantasia || tenant?.name}</div>
              )}
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
              onClick={() => logout.mutate()}
              className="block w-full rounded-b-container px-4 py-2.5 text-left text-sm text-danger hover:bg-danger/10"
            >
              Sair
            </button>
          </div>
        )}
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
                className="rounded-control border border-border-strong bg-surface px-3 py-2"
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
                className="rounded-control border border-border-strong bg-surface px-3 py-2"
              />
            </label>
            {passwordError && <p className="text-sm text-danger">{passwordError}</p>}
            <Button type="submit" disabled={changePassword.isPending} className="self-start">
              Salvar nova senha
            </Button>
          </form>
        )}
      </Drawer>
    </header>
  );
}
