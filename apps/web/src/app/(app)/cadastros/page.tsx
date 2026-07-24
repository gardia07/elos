'use client';

import Link from 'next/link';
import { Card } from '@/components/ui';
import { Header } from '@/components/header';

const GRUPOS = [
  {
    titulo: 'Empresa',
    itens: [
      { label: 'Dados da empresa', descricao: 'Razão social, CNPJ, endereço, representante legal', href: '/configuracoes' },
      { label: 'Usuários e permissões', descricao: 'Contas de acesso e perfis', href: '/configuracoes' },
      { label: 'Licença e plano comercial', descricao: 'Plano contratado e limites', href: '/configuracoes/licenca' },
    ],
  },
  {
    titulo: 'Estrutura organizacional',
    itens: [
      { label: 'Colaboradores', descricao: 'Cadastro dos colaboradores', href: '/gestao-de-pessoas/colaboradores' },
      { label: 'Tabela de cargos', descricao: 'Cargos, CBO e faixas salariais', href: '/dp/cargos' },
      { label: 'Departamentos', descricao: 'Setores da empresa', href: '/dp/departamentos' },
    ],
  },
  {
    titulo: 'Departamento Pessoal',
    itens: [
      { label: 'Benefícios', descricao: 'Catálogo de benefícios oferecidos', href: '/dp/beneficios' },
      { label: 'CCT/Convenções', descricao: 'Convenções coletivas de trabalho', href: '/dp/cct' },
      { label: 'Prazos trabalhistas', descricao: 'Obrigações e prazos legais', href: '/dp/prazos' },
    ],
  },
];

export default function CadastrosPage() {
  return (
    <>
      <Header eyebrow="Administração" title="Cadastros" />
      <main className="flex-1 overflow-y-auto px-8 py-6">
        <div className="flex flex-col gap-6">
          {GRUPOS.map((grupo) => (
            <div key={grupo.titulo} className="flex flex-col gap-3">
              <h3 className="text-xs font-semibold uppercase tracking-[0.06em] text-text-tertiary">{grupo.titulo}</h3>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {grupo.itens.map((item) => (
                  <Link key={item.label} href={item.href}>
                    <Card className="flex h-full flex-col gap-1 transition hover:border-accent">
                      <span className="text-sm font-semibold text-text">{item.label}</span>
                      <span className="text-xs text-text-secondary">{item.descricao}</span>
                    </Card>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      </main>
    </>
  );
}
