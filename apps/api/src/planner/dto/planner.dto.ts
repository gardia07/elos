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
  @IsOptional() @IsString() intencoes?: string;
  @IsOptional() @IsString() oQueFuncionou?: string;
  @IsOptional() @IsString() oQueNaoFuncionou?: string;
  @IsOptional() @IsString() oQuePrecisaMudar?: string;
}
