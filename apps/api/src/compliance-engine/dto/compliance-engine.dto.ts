import { IsBoolean, IsIn, IsISO8601, IsObject, IsOptional, IsString, IsUUID } from 'class-validator';

const TIPOS_EVENTO = [
  'ADMISSAO',
  'MUDANCA_CARGO_FUNCAO',
  'MUDANCA_CARGA_HORARIA',
  'MUDANCA_SALARIAL',
  'INICIO_AFASTAMENTO',
  'ACIDENTE_TRABALHO',
  'RETORNO_AFASTAMENTO',
  'LICENCA_MATERNIDADE',
  'TRANSFERENCIA_LOCAL',
  'MUDANCA_REGIME_TRABALHO',
  'ADVERTENCIA_SUSPENSAO',
  'ASO_PERIODICO_VENCIDO',
  'TREINAMENTO_NR_VENCIDO',
  'DESLIGAMENTO',
  'AFASTAMENTO_RECAIDA_15_DIAS',
] as const;

export class RegistrarEventoDto {
  @IsUUID() employeeId!: string;
  @IsIn(TIPOS_EVENTO) tipoEvento!: (typeof TIPOS_EVENTO)[number];
  @IsOptional() @IsISO8601() dataEvento?: string;
  @IsOptional() @IsObject() dadosAnteriores?: Record<string, unknown>;
  @IsOptional() @IsObject() dadosNovos?: Record<string, unknown>;
}

export class UpdateRegraConformidadeDto {
  @IsOptional() @IsBoolean() ativo?: boolean;
  @IsOptional() @IsBoolean() bloqueante?: boolean;
  @IsOptional() prazoDias?: number;
  @IsOptional() @IsString() baseLegal?: string;
}
