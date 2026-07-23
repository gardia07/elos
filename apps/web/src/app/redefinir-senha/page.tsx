'use client';

import { Suspense, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api-client';

export default function RedefinirSenhaPage() {
  return (
    <Suspense fallback={null}>
      <RedefinirSenhaForm />
    </Suspense>
  );
}

function RedefinirSenhaForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token') ?? '';
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const reset = useMutation({
    mutationFn: async () => api.post('/auth/reset-password', { token, newPassword }),
    onSuccess: () => setSuccess(true),
    onError: () => setError('Link inválido ou expirado. Solicite um novo.'),
  });

  return (
    <div className="flex min-h-screen items-center justify-center bg-accent px-4">
      <div className="w-full max-w-sm rounded-[20px] border border-border bg-surface p-8 shadow-lg">
        <div className="mb-8 flex justify-center">
          <Image src="/logo-elos.png" alt="elos" width={966} height={562} priority className="h-12 w-auto" />
        </div>

        {!token ? (
          <p className="text-sm text-danger">Link inválido. Solicite uma nova redefinição na tela de login.</p>
        ) : success ? (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-success">Senha redefinida com sucesso.</p>
            <Link href="/login" className="rounded-[10px] bg-accent px-4 py-2.5 text-center text-sm font-semibold text-on-accent">
              Ir para o login
            </Link>
          </div>
        ) : (
          <form
            className="flex flex-col gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              if (newPassword !== confirmPassword) {
                setError('As senhas não coincidem.');
                return;
              }
              setError('');
              reset.mutate();
            }}
          >
            <p className="text-sm text-text-secondary">Escolha sua nova senha.</p>
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="text-text-secondary">Nova senha</span>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={8}
                className="rounded-[10px] border border-border-strong bg-surface px-3 py-2 text-text outline-none focus:border-accent"
              />
            </label>
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="text-text-secondary">Confirmar senha</span>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={8}
                className="rounded-[10px] border border-border-strong bg-surface px-3 py-2 text-text outline-none focus:border-accent"
              />
            </label>
            {error && <p className="text-sm text-danger">{error}</p>}
            <button
              type="submit"
              disabled={reset.isPending}
              className="mt-2 rounded-[10px] bg-accent px-4 py-2.5 text-sm font-semibold text-on-accent transition disabled:opacity-60"
            >
              {reset.isPending ? 'Salvando…' : 'Redefinir senha'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
