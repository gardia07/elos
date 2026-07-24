'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api-client';

export default function CadastroPage() {
  const [companyName, setCompanyName] = useState('');
  const [adminName, setAdminName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [tenantSlug, setTenantSlug] = useState('');

  const registerMutation = useMutation({
    mutationFn: async () =>
      (await api.post('/auth/register-tenant', { companyName, adminName, email, password })).data,
    onSuccess: (data) => {
      setTenantSlug(data.tenantSlug);
      setError('');
    },
    onError: (err: unknown) => {
      const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(message ?? 'Não foi possível concluir o cadastro.');
    },
  });

  return (
    <div className="flex min-h-screen items-center justify-center bg-accent px-4">
      <div className="w-full max-w-sm rounded-[20px] border border-border bg-surface p-8 shadow-lg">
        <div className="mb-8 flex justify-center">
          <Image src="/logo-elos.png" alt="elos" width={966} height={562} priority className="h-12 w-auto" />
        </div>

        {!tenantSlug ? (
          <form
            className="flex flex-col gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              registerMutation.mutate();
            }}
          >
            <Field label="Nome da empresa" value={companyName} onChange={setCompanyName} />
            <Field label="Seu nome" value={adminName} onChange={setAdminName} />
            <Field label="E-mail" type="email" value={email} onChange={setEmail} />
            <Field label="Senha" type="password" value={password} onChange={setPassword} minLength={8} />
            {error && <p className="text-sm text-danger">{error}</p>}
            <button
              type="submit"
              disabled={registerMutation.isPending}
              className="mt-2 rounded-[10px] bg-accent px-4 py-2.5 text-sm font-semibold text-on-accent transition disabled:opacity-60"
            >
              {registerMutation.isPending ? 'Criando…' : 'Criar empresa'}
            </button>
            <Link href="/login" className="text-center text-sm text-text-secondary hover:text-accent">
              Já tenho uma conta
            </Link>
          </form>
        ) : (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-text-secondary">
              Empresa criada. Use este identificador para entrar:
            </p>
            <p className="rounded-[10px] bg-tint-blue px-3 py-2 text-sm font-semibold text-text">{tenantSlug}</p>
            <Link
              href="/login"
              className="mt-2 rounded-[10px] bg-accent px-4 py-2.5 text-center text-sm font-semibold text-on-accent transition"
            >
              Ir para o login
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = 'text',
  minLength,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  minLength?: number;
}) {
  return (
    <label className="flex flex-col gap-1.5 text-sm">
      <span className="text-text-secondary">{label}</span>
      <input
        type={type}
        value={value}
        minLength={minLength}
        onChange={(e) => onChange(e.target.value)}
        required
        className="rounded-[10px] border border-border-strong bg-surface px-3 py-2 text-text outline-none focus:border-accent"
      />
    </label>
  );
}
