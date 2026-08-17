import { IsBoolean, IsDateString, IsIn, IsInt, IsNumber, IsOptional, IsString, Max, Min, MinLength } from 'class-validator';

// ── Metas ──────────────────────────────────────────────────────

export class CreateMetaDto {
  @IsInt() ano!: number;
  @IsString() @MinLength(1) titulo!: string;
}

export class UpdateMetaDto {
  @IsOptional() @IsString() @MinLength(1) titulo?: string;
  @IsOptional() @IsBoolean() concluida?: boolean;
  @IsOptional() @IsInt() ordem?: number;
}

// ── Hábitos ────────────────────────────────────────────────────

export class CreateHabitoDto {
  @IsInt() ano!: number;
  @IsString() @MinLength(1) nome!: string;
  @IsOptional() @IsString() cor?: string;
}

export class UpdateHabitoDto {
  @IsOptional() @IsString() @MinLength(1) nome?: string;
  @IsOptional() @IsString() cor?: string;
  @IsOptional() @IsInt() ordem?: number;
}

export class ToggleHabitoDto {
  @IsDateString() data!: string;
}

// ── Finanças pessoais ──────────────────────────────────────────

const FINANCA_TIPOS = ['RECEITA', 'DESPESA'] as const;
export type FinancaPessoalTipoDto = (typeof FINANCA_TIPOS)[number];

export class CreateCategoriaFinanceiraDto {
  @IsInt() ano!: number;
  @IsString() @MinLength(1) nome!: string;
  @IsIn(FINANCA_TIPOS) tipo!: FinancaPessoalTipoDto;
}

export class UpdateCategoriaFinanceiraDto {
  @IsOptional() @IsString() @MinLength(1) nome?: string;
  @IsOptional() @IsInt() ordem?: number;
}

export class SetLancamentoDto {
  @IsNumber() valor!: number;
}

// ── Humor ──────────────────────────────────────────────────────

export class SetHumorDto {
  @IsDateString() data!: string;
  @IsInt() @Min(1) @Max(5) nivel!: number;
  @IsOptional() @IsString() nota?: string;
  @IsOptional() @IsString() gratidao1?: string;
  @IsOptional() @IsString() gratidao2?: string;
  @IsOptional() @IsString() gratidao3?: string;
}

// ── Ciclo menstrual ────────────────────────────────────────────

export class CreateCicloDto {
  @IsDateString() dataInicio!: string;
  @IsOptional() @IsInt() @Min(1) @Max(15) duracaoDias?: number;
  @IsOptional() @IsString() sintomas?: string;
}

export class UpdateCicloDto {
  @IsOptional() @IsDateString() dataInicio?: string;
  @IsOptional() @IsInt() @Min(1) @Max(15) duracaoDias?: number;
  @IsOptional() @IsString() sintomas?: string;
}

// ── Peso e medidas ─────────────────────────────────────────────

export class SetPesoMedidaDto {
  @IsDateString() data!: string;
  @IsOptional() @IsNumber() pesoKg?: number;
  @IsOptional() @IsNumber() alturaCm?: number;
  @IsOptional() @IsNumber() cinturaCm?: number;
  @IsOptional() @IsNumber() quadrilCm?: number;
  @IsOptional() @IsNumber() bracoCm?: number;
  @IsOptional() @IsInt() @Min(0) aguaMl?: number;
  @IsOptional() @IsString() notas?: string;
}

// ── Roda da vida ───────────────────────────────────────────────

export class SetRodaDaVidaDto {
  @IsDateString() data!: string;
  @IsInt() @Min(1) @Max(10) carreira!: number;
  @IsInt() @Min(1) @Max(10) financas!: number;
  @IsInt() @Min(1) @Max(10) saude!: number;
  @IsInt() @Min(1) @Max(10) familiaAmigos!: number;
  @IsInt() @Min(1) @Max(10) relacionamento!: number;
  @IsInt() @Min(1) @Max(10) crescimentoPessoal!: number;
  @IsInt() @Min(1) @Max(10) lazer!: number;
  @IsInt() @Min(1) @Max(10) ambienteFisico!: number;
}

// ── Revisão mensal ─────────────────────────────────────────────

export class SetRevisaoMensalDto {
  @IsInt() ano!: number;
  @IsInt() @Min(1) @Max(12) mes!: number;
  // Início do mês — método WOOP.
  @IsOptional() @IsString() desejo?: string;
  @IsOptional() @IsString() resultado?: string;
  @IsOptional() @IsString() obstaculo?: string;
  @IsOptional() @IsString() plano?: string;
  // Fim do mês — reflexão guiada.
  @IsOptional() @IsInt() @Min(1) @Max(10) satisfacao?: number;
  @IsOptional() @IsString() conquistas?: string;
  @IsOptional() @IsString() oQueNaoFuncionou?: string;
  @IsOptional() @IsString() proximoPasso?: string;
}

// ── Melhor eu possível ─────────────────────────────────────────

export class SetMelhorEuPossivelDto {
  @IsDateString() data!: string;
  @IsString() @MinLength(1) texto!: string;
}

// ── Ikigai ─────────────────────────────────────────────────────

export class SetIkigaiDto {
  @IsDateString() data!: string;
  @IsOptional() @IsString() oQueAma?: string;
  @IsOptional() @IsString() noQueEBom?: string;
  @IsOptional() @IsString() oMundoPrecisa?: string;
  @IsOptional() @IsString() peloQuePodeSerPago?: string;
  @IsOptional() @IsString() sintese?: string;
}

// ── SWOT pessoal ───────────────────────────────────────────────

export class SetSwotPessoalDto {
  @IsDateString() data!: string;
  @IsOptional() @IsString() forcas?: string;
  @IsOptional() @IsString() fraquezas?: string;
  @IsOptional() @IsString() oportunidades?: string;
  @IsOptional() @IsString() ameacas?: string;
}
