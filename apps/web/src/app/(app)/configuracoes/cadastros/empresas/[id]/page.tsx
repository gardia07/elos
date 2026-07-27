'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { Button, Card } from '@/components/ui';
import { EmpresaFormFields, toEmpresaForm, type EmpresaForm, type TenantInfo } from '@/components/empresa-form';

export default function PerfilEmpresaPage() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [empresaEdited, setEmpresaEdited] = useState(false);
  const [empresa, setEmpresa] = useState<EmpresaForm>(toEmpresaForm());

  const { data: tenant, isLoading, isError, error } = useQuery({
    queryKey: ['auth', 'company', id],
    queryFn: async () => (await api.get<TenantInfo>(`/auth/companies/${id}`)).data,
  });

  useEffect(() => {
    if (tenant && !empresaEdited) setEmpresa(toEmpresaForm(tenant));
  }, [tenant, empresaEdited]);

  const [saved, setSaved] = useState(false);
  const save = useMutation({
    mutationFn: async () =>
      api.patch(`/auth/companies/${id}`, {
        ...empresa,
        regimeTributario: empresa.regimeTributario || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['auth', 'company', id] });
      queryClient.invalidateQueries({ queryKey: ['auth', 'companies'] });
      queryClient.invalidateQueries({ queryKey: ['auth', 'me'] });
      setEmpresaEdited(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    },
  });

  const errorStatus = (error as { response?: { status?: number } } | undefined)?.response?.status;

  if (isError) {
    return (
      <div className="flex flex-col gap-4">
        <Link href="/configuracoes/cadastros" className="text-sm text-accent hover:underline">← Voltar</Link>
        <Card>
          <p className="text-sm text-danger">
            {errorStatus === 403
              ? 'Apenas administradores podem editar esta empresa.'
              : 'Empresa não encontrada.'}
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <Link href="/configuracoes/cadastros" className="text-sm text-accent hover:underline">← Voltar</Link>

      <Card className="flex flex-col gap-4">
        <h3 className="text-sm font-semibold">
          Perfil da empresa{tenant ? `: ${tenant.nomeFantasia || tenant.name}` : ''}
        </h3>

        {isLoading ? (
          <p className="text-sm text-text-tertiary">Carregando…</p>
        ) : (
          <>
            <EmpresaFormFields
              value={empresa}
              onChange={(next) => { setEmpresa(next); setEmpresaEdited(true); }}
            />

            <div className="flex items-center gap-3">
              <Button className="self-start" onClick={() => save.mutate()} disabled={save.isPending}>
                {save.isPending ? 'Salvando…' : 'Salvar'}
              </Button>
              {saved && <span className="text-sm text-success">Salvo com sucesso.</span>}
              {save.isError && <span className="text-sm text-danger">Não foi possível salvar.</span>}
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
