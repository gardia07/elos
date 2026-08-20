import { IsBoolean, IsDateString, IsIn, IsInt, IsOptional, IsString, IsUUID, Min, MinLength } from 'class-validator';

const TIPOS_FRACAO = ['NORMAL', 'COLETIVA'] as const;
export type TipoFracaoDto = (typeof TIPOS_FRACAO)[number];

export class ProgramarFeriasDto {
  @IsUUID() periodoAquisitivoId!: string;
  @IsOptional() @IsIn(TIPOS_FRACAO) tipo?: TipoFracaoDto;
  @IsDateString() dataInicio!: string;
  @IsInt() @Min(1) dias!: number;
  @IsOptional() @IsInt() @Min(0) diasAbono?: number;
  @IsOptional() @IsBoolean() antecipa13?: boolean;
  @IsOptional() @IsString() justificativa?: string;
  /** Lançamento de dado histórico (já aconteceu de fato) -- pula aviso de 30 dias e
   * prazo/decadência do abono, mantém saldo/fracionamento/limite de dias, e a fração
   * já nasce aprovada em vez de pendente. */
  @IsOptional() @IsBoolean() historico?: boolean;
}

export class ReprovarFracaoDto {
  @IsOptional() @IsString() motivo?: string;
}

export class ListarPeriodosQueryDto {
  @IsOptional() @IsIn(['EM_AQUISICAO', 'DISPONIVEL', 'A_VENCER', 'VENCIDA', 'PARCIALMENTE_GOZADA', 'QUITADA']) status?: string;
  @IsOptional() @IsIn(['PENDENTES', 'APROVADAS', 'EM_FERIAS']) statusFracao?: string;
  @IsOptional() @IsString() nome?: string;
  @IsOptional() @IsString() filial?: string;
  @IsOptional() @IsDateString() dataInicio?: string;
  @IsOptional() @IsDateString() dataFim?: string;
}

export class CreateFaltaDto {
  @IsDateString() data!: string;
  @IsOptional() @IsString() motivo?: string;
}
