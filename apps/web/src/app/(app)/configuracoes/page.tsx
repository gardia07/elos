'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { Button, Card } from '@/components/ui';
import { EmpresaFormFields, toEmpresaForm, type EmpresaForm, type TenantInfo } from '@/components/empresa-form';

export default function ConfiguracoesPage() {
  const queryClient = useQueryClient();
  const [empresaEdited, setEmpresaEdited] = useState(false);
  const [empresa, setEmpresa] = useState<EmpresaForm>(toEmpresaForm());

  const { data: tenant } = useQuery({
    queryKey: ['tenant'],
    queryFn: async () => (await api.get<TenantInfo>('/tenant')).data,
  });

  useEffect(() => {
    if (tenant && !empresaEdited) setEmpresa(toEmpresaForm(tenant));
  }, [tenant, empresaEdited]);

  const [tenantSaved, setTenantSaved] = useState(false);
  const saveTenant = useMutation({
    mutationFn: async () =>
      api.patch('/tenant', {
        ...empresa,
        regimeTributario: empresa.regimeTributario || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenant'] });
      setEmpresaEdited(false);
      setTenantSaved(true);
      setTimeout(() => setTenantSaved(false), 3000);
    },
  });

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card className="flex flex-col gap-4 lg:col-span-2">
            <h3 className="text-sm font-semibold">Dados da empresa</h3>

            <EmpresaFormFields
              value={empresa}
              onChange={(next) => { setEmpresa(next); setEmpresaEdited(true); }}
            />

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
              <Link href="/configuracoes/cadastros" className="text-accent hover:underline">Usuários, perfis e empresas →</Link>
              <Link href="/configuracoes/licenca" className="text-accent hover:underline">Licença e plano comercial →</Link>
              <Link href="/gestao-de-pessoas/colaboradores" className="text-accent hover:underline">Documentos obrigatórios (Colaboradores) →</Link>
              <Link href="/gestao-de-pessoas/desligamento" className="text-accent hover:underline">Checklist de desligamento →</Link>
              <Link href="/ferramentas/integracoes" className="text-accent hover:underline">Integrações →</Link>
            </div>
          </Card>
    </div>
  );
}
