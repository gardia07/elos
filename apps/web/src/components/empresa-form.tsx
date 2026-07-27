'use client';

import { maskCEP, maskCNPJ, maskCPF } from '@/lib/format';

export interface TenantInfo {
  name: string;
  slug: string;
  nomeFantasia: string | null;
  logoUrl: string | null;
  razaoSocial: string | null;
  cnpj: string | null;
  inscricaoEstadual: string | null;
  inscricaoMunicipal: string | null;
  cnae: string | null;
  regimeTributario: 'SIMPLES_NACIONAL' | 'LUCRO_PRESUMIDO' | 'LUCRO_REAL' | null;
  cep: string | null;
  logradouro: string | null;
  numero: string | null;
  complemento: string | null;
  bairro: string | null;
  cidade: string | null;
  uf: string | null;
  representanteLegalNome: string | null;
  representanteLegalCpf: string | null;
  representanteLegalCargo: string | null;
}

const REGIME_TRIBUTARIO_LABEL: Record<string, string> = {
  SIMPLES_NACIONAL: 'Simples Nacional',
  LUCRO_PRESUMIDO: 'Lucro Presumido',
  LUCRO_REAL: 'Lucro Real',
};

export type EmpresaForm = {
  nomeFantasia: string;
  logoUrl: string;
  razaoSocial: string; cnpj: string;
  inscricaoEstadual: string; inscricaoMunicipal: string; cnae: string;
  regimeTributario: '' | 'SIMPLES_NACIONAL' | 'LUCRO_PRESUMIDO' | 'LUCRO_REAL';
  cep: string; logradouro: string; numero: string; complemento: string; bairro: string; cidade: string; uf: string;
  representanteLegalNome: string; representanteLegalCpf: string; representanteLegalCargo: string;
};

export function toEmpresaForm(t?: TenantInfo): EmpresaForm {
  return {
    nomeFantasia: t?.nomeFantasia ?? '',
    logoUrl: t?.logoUrl ?? '',
    razaoSocial: t?.razaoSocial ?? '', cnpj: t?.cnpj ?? '',
    inscricaoEstadual: t?.inscricaoEstadual ?? '', inscricaoMunicipal: t?.inscricaoMunicipal ?? '', cnae: t?.cnae ?? '',
    regimeTributario: t?.regimeTributario ?? '',
    cep: t?.cep ?? '', logradouro: t?.logradouro ?? '', numero: t?.numero ?? '', complemento: t?.complemento ?? '',
    bairro: t?.bairro ?? '', cidade: t?.cidade ?? '', uf: t?.uf ?? '',
    representanteLegalNome: t?.representanteLegalNome ?? '', representanteLegalCpf: t?.representanteLegalCpf ?? '',
    representanteLegalCargo: t?.representanteLegalCargo ?? '',
  };
}

export function EmpresaFormFields({
  value,
  onChange,
}: {
  value: EmpresaForm;
  onChange: (next: EmpresaForm) => void;
}) {
  return (
    <>
      <div className="flex items-center gap-4">
        {value.logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={value.logoUrl} alt="Logo da empresa" className="h-16 w-16 rounded-[10px] border border-border object-contain" />
        ) : (
          <div className="flex h-16 w-16 items-center justify-center rounded-[10px] border border-dashed border-border-strong text-xs text-text-tertiary">
            Sem logo
          </div>
        )}
        <label className="cursor-pointer rounded-[10px] border border-border-strong bg-surface px-3 py-2 text-sm text-text hover:border-accent">
          {value.logoUrl ? 'Trocar logo' : 'Enviar logo'}
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              const reader = new FileReader();
              reader.onload = () => {
                onChange({ ...value, logoUrl: reader.result as string });
              };
              reader.readAsDataURL(file);
            }}
          />
        </label>
        {value.logoUrl && (
          <button
            type="button"
            onClick={() => onChange({ ...value, logoUrl: '' })}
            className="text-sm text-danger hover:underline"
          >
            Remover
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <EmpresaField label="Nome fantasia" value={value.nomeFantasia} onChange={(v) => onChange({ ...value, nomeFantasia: v })} className="lg:col-span-2" />
        <EmpresaField label="Razão social" value={value.razaoSocial} onChange={(v) => onChange({ ...value, razaoSocial: v })} className="lg:col-span-2" />
        <EmpresaField label="CNPJ" value={value.cnpj} onChange={(v) => onChange({ ...value, cnpj: maskCNPJ(v) })} />
        <EmpresaField label="Inscrição estadual" value={value.inscricaoEstadual} onChange={(v) => onChange({ ...value, inscricaoEstadual: v })} />
        <EmpresaField label="Inscrição municipal" value={value.inscricaoMunicipal} onChange={(v) => onChange({ ...value, inscricaoMunicipal: v })} />
        <EmpresaField label="CNAE" value={value.cnae} onChange={(v) => onChange({ ...value, cnae: v })} placeholder="0000-0/00" />
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="text-text-secondary">Regime tributário</span>
          <select
            value={value.regimeTributario}
            onChange={(e) => onChange({ ...value, regimeTributario: e.target.value as EmpresaForm['regimeTributario'] })}
            className="rounded-[10px] border border-border-strong bg-surface px-3 py-2 text-text"
          >
            <option value="">Não informado</option>
            {Object.entries(REGIME_TRIBUTARIO_LABEL).map(([v, label]) => (
              <option key={v} value={v}>{label}</option>
            ))}
          </select>
        </label>
      </div>

      <h4 className="text-xs font-semibold uppercase tracking-[0.06em] text-text-tertiary">Endereço</h4>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <EmpresaField label="CEP" value={value.cep} onChange={(v) => onChange({ ...value, cep: maskCEP(v) })} />
        <EmpresaField label="Logradouro" value={value.logradouro} onChange={(v) => onChange({ ...value, logradouro: v })} className="lg:col-span-2" />
        <EmpresaField label="Número" value={value.numero} onChange={(v) => onChange({ ...value, numero: v })} />
        <EmpresaField label="Complemento" value={value.complemento} onChange={(v) => onChange({ ...value, complemento: v })} />
        <EmpresaField label="Bairro" value={value.bairro} onChange={(v) => onChange({ ...value, bairro: v })} />
        <EmpresaField label="Cidade" value={value.cidade} onChange={(v) => onChange({ ...value, cidade: v })} />
        <EmpresaField label="UF" value={value.uf} onChange={(v) => onChange({ ...value, uf: v.toUpperCase().slice(0, 2) })} />
      </div>

      <h4 className="text-xs font-semibold uppercase tracking-[0.06em] text-text-tertiary">Representante legal</h4>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <EmpresaField label="Nome" value={value.representanteLegalNome} onChange={(v) => onChange({ ...value, representanteLegalNome: v })} />
        <EmpresaField label="CPF" value={value.representanteLegalCpf} onChange={(v) => onChange({ ...value, representanteLegalCpf: maskCPF(v) })} />
        <EmpresaField label="Cargo" value={value.representanteLegalCargo} onChange={(v) => onChange({ ...value, representanteLegalCargo: v })} />
      </div>
    </>
  );
}

function EmpresaField({
  label,
  value,
  onChange,
  placeholder,
  className = '',
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
}) {
  return (
    <label className={`flex flex-col gap-1.5 text-sm ${className}`}>
      <span className="text-text-secondary">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="rounded-[10px] border border-border-strong bg-surface px-3 py-2"
      />
    </label>
  );
}
