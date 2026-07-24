'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';

type Step = 'credentials' | 'mfa' | 'forgot';

export default function LoginPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [step, setStep] = useState<Step>('credentials');
  const [tenantSlug, setTenantSlug] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginTicket, setLoginTicket] = useState('');
  const [devCode, setDevCode] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [forgotMessage, setForgotMessage] = useState('');
  const [devResetUrl, setDevResetUrl] = useState('');

  const loginMutation = useMutation({
    mutationFn: async () => (await api.post('/auth/login', { tenantSlug, email, password })).data,
    onSuccess: (data) => {
      setLoginTicket(data.loginTicket);
      setDevCode(data.devCode ?? '');
      setCode(data.devCode ?? '');
      setStep('mfa');
      setError('');
    },
    onError: (err: unknown) => {
      const status = (err as { response?: { status?: number; data?: { message?: string } } })?.response?.status;
      const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(status === 429 && message ? message : 'Credenciais inválidas.');
    },
  });

  const mfaMutation = useMutation({
    mutationFn: async () => (await api.post('/auth/verify-mfa', { loginTicket, code })).data,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['auth', 'me'] });
      router.replace('/painel');
    },
    onError: () => setError('Código inválido ou expirado.'),
  });

  const forgotMutation = useMutation({
    mutationFn: async () => (await api.post('/auth/forgot-password', { tenantSlug, email })).data,
    onSuccess: (data) => {
      setForgotMessage(data.message);
      setDevResetUrl(data.devResetUrl ?? '');
    },
  });

  return (
    <div className="flex min-h-screen items-center justify-center bg-accent px-4">
      <div className="w-full max-w-sm rounded-[20px] border border-border bg-surface p-8 shadow-lg">
        <div className="mb-8 flex justify-center">
          <Image src="/logo-elos.png" alt="elos" width={966} height={562} priority className="h-12 w-auto" />
        </div>

        {step === 'credentials' && (
          <form
            className="flex flex-col gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              loginMutation.mutate();
            }}
          >
            <Field label="Empresa (slug)" value={tenantSlug} onChange={setTenantSlug} />
            <Field label="E-mail" type="email" value={email} onChange={setEmail} />
            <Field label="Senha" type="password" value={password} onChange={setPassword} />
            {error && <p className="text-sm text-danger">{error}</p>}
            <button
              type="submit"
              disabled={loginMutation.isPending}
              className="mt-2 rounded-[10px] bg-accent px-4 py-2.5 text-sm font-semibold text-on-accent transition disabled:opacity-60"
            >
              {loginMutation.isPending ? 'Entrando…' : 'Entrar'}
            </button>
            <button
              type="button"
              onClick={() => {
                setStep('forgot');
                setForgotMessage('');
                setDevResetUrl('');
                setError('');
              }}
              className="text-center text-sm text-text-secondary hover:text-accent"
            >
              Esqueci minha senha
            </button>
            <Link href="/cadastro" className="text-center text-sm text-text-secondary hover:text-accent">
              Cadastrar minha empresa
            </Link>
          </form>
        )}

        {step === 'mfa' && (
          <form
            className="flex flex-col gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              mfaMutation.mutate();
            }}
          >
            <p className="text-sm text-text-secondary">
              Digite o código de 6 dígitos enviado para o seu e-mail.
            </p>
            {devCode && (
              <p className="rounded-[10px] bg-tint-blue px-3 py-2 text-xs text-text-secondary">
                Modo dev: código gerado <strong>{devCode}</strong> (sem provedor de e-mail configurado).
              </p>
            )}
            <Field label="Código" value={code} onChange={setCode} maxLength={6} />
            {error && <p className="text-sm text-danger">{error}</p>}
            <button
              type="submit"
              disabled={mfaMutation.isPending}
              className="mt-2 rounded-[10px] bg-accent px-4 py-2.5 text-sm font-semibold text-on-accent transition disabled:opacity-60"
            >
              {mfaMutation.isPending ? 'Verificando…' : 'Verificar'}
            </button>
          </form>
        )}

        {step === 'forgot' && (
          <div className="flex flex-col gap-4">
            {!forgotMessage ? (
              <form
                className="flex flex-col gap-4"
                onSubmit={(e) => {
                  e.preventDefault();
                  forgotMutation.mutate();
                }}
              >
                <p className="text-sm text-text-secondary">Informe sua empresa e e-mail para receber o link de redefinição.</p>
                <Field label="Empresa (slug)" value={tenantSlug} onChange={setTenantSlug} />
                <Field label="E-mail" type="email" value={email} onChange={setEmail} />
                <button
                  type="submit"
                  disabled={forgotMutation.isPending}
                  className="mt-2 rounded-[10px] bg-accent px-4 py-2.5 text-sm font-semibold text-on-accent transition disabled:opacity-60"
                >
                  {forgotMutation.isPending ? 'Enviando…' : 'Enviar link de recuperação'}
                </button>
              </form>
            ) : (
              <div className="flex flex-col gap-3">
                <p className="text-sm text-text-secondary">{forgotMessage}</p>
                {devResetUrl && (
                  <p className="rounded-[10px] bg-tint-blue px-3 py-2 text-xs text-text-secondary">
                    Modo dev: <Link href={devResetUrl} className="text-accent underline">{devResetUrl}</Link> (sem provedor de e-mail configurado).
                  </p>
                )}
              </div>
            )}
            <button onClick={() => setStep('credentials')} className="text-center text-sm text-text-secondary hover:text-accent">
              ← Voltar para o login
            </button>
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
  maxLength,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  maxLength?: number;
}) {
  return (
    <label className="flex flex-col gap-1.5 text-sm">
      <span className="text-text-secondary">{label}</span>
      <input
        type={type}
        value={value}
        maxLength={maxLength}
        onChange={(e) => onChange(e.target.value)}
        required
        className="rounded-[10px] border border-border-strong bg-surface px-3 py-2 text-text outline-none focus:border-accent"
      />
    </label>
  );
}
