import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  ValidateNested,
} from 'class-validator';

export const TERMINATION_TIPOS = [
  'SEM_JUSTA_CAUSA',
  'PEDIDO_DEMISSAO',
  'ACORDO',
  'JUSTA_CAUSA',
  'ACORDO_MUTUO',
  'FIM_CONTRATO_EXPERIENCIA',
  'APOSENTADORIA',
  'RESCISAO_INDIRETA',
  'OBITO',
] as const;
export type TerminationTipo = (typeof TERMINATION_TIPOS)[number];

export const TERMINATION_STATUSES = [
  'RASCUNHO',
  'EM_ANDAMENTO',
  'AGUARDANDO_EXAME',
  'PRONTO_PARA_EFETIVAR',
  'EFETIVADO',
  'EM_HOMOLOGACAO',
  'CONCLUIDO',
  'CANCELADO',
] as const;
export type TerminationStatusValue = (typeof TERMINATION_STATUSES)[number];

export class CreateTerminationDto {
  @IsUUID() employeeId!: string;
  @IsIn(TERMINATION_TIPOS) tipo!: TerminationTipo;
  @IsDateString() data!: string;
  @IsOptional() @IsString() motivo?: string;
  @IsOptional() @IsDateString() avisoPrevioInicio?: string;
  @IsOptional()
  @IsIn(['TRABALHADO', 'INDENIZADO', 'ISENTO'])
  avisoPrevioTipo?: string;
  @IsOptional() @IsDateString() dataBeneficioInss?: string;
}

export class ToggleTerminationDocDto {
  @IsString() key!: string;
  @IsBoolean() checked!: boolean;
}

export class UpdateTerminationStatusDto {
  @IsIn(TERMINATION_STATUSES) status!: TerminationStatusValue;
}

export class SendEsocialDto {
  @IsOptional() @IsIn(['S-2299', 'S-2399']) evento?: string;
  @IsOptional() @IsString() protocolo?: string;
}

export const AVALIACAO_NIVEIS = ['INSATISFATORIO', 'REGULAR', 'BOM', 'EXCELENTE'] as const;
export type AvaliacaoNivel = (typeof AVALIACAO_NIVEIS)[number];

export class FatoresDesligamentoDto {
  @IsOptional() @IsBoolean() remuneracao?: boolean | null;
  @IsOptional() @IsBoolean() faltaCrescimento?: boolean | null;
  @IsOptional() @IsBoolean() relacionamentoEquipe?: boolean | null;
  @IsOptional() @IsBoolean() relacionamentoSuperior?: boolean | null;
  @IsOptional() @IsBoolean() condicoesTrabalho?: boolean | null;
  @IsOptional() @IsBoolean() outraEmpresa?: boolean | null;
  @IsOptional() @IsString() outros?: string;
}

export class AmbienteTrabalhoDto {
  @IsOptional() @IsIn(AVALIACAO_NIVEIS) integracaoEquipe?: AvaliacaoNivel | null;
  @IsOptional() @IsIn(AVALIACAO_NIVEIS) relacionamentoSuperior?: AvaliacaoNivel | null;
  @IsOptional() @IsIn(AVALIACAO_NIVEIS) relacionamentoGerencia?: AvaliacaoNivel | null;
  @IsOptional() @IsIn(AVALIACAO_NIVEIS) relacionamentoRH?: AvaliacaoNivel | null;
  @IsOptional() @IsIn(AVALIACAO_NIVEIS) comunicacaoAreas?: AvaliacaoNivel | null;
}

export class ExitInterviewDto {
  @IsOptional() @ValidateNested() @Type(() => FatoresDesligamentoDto) fatores?: FatoresDesligamentoDto;
  @IsOptional() @ValidateNested() @Type(() => AmbienteTrabalhoDto) ambiente?: AmbienteTrabalhoDto;
  @IsOptional() @IsIn(AVALIACAO_NIVEIS) avaliacaoGeral?: AvaliacaoNivel | null;
  @IsOptional() @IsBoolean() voltariaTrabalhar?: boolean | null;
  @IsOptional() @IsString() voltariaPorque?: string;
  @IsOptional() @IsArray() @IsString({ each: true }) pontosPositivos?: string[];
  @IsOptional() @IsArray() @IsString({ each: true }) pontosNegativos?: string[];
  @IsOptional() @IsString() comentarios?: string;
}

export class ChecklistItemInputDto {
  @IsString() key!: string;
  @IsString() nome!: string;
  @IsBoolean() ativo!: boolean;
  @IsOptional() @IsBoolean() bloqueante?: boolean;
  @IsOptional() @IsIn(['PROCESSO', 'COMPLIANCE']) categoria?: string;
  @IsOptional() @IsArray() @IsString({ each: true }) aplicaTipos?: string[];
}

export class SetTerminationChecklistDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ChecklistItemInputDto)
  items!: ChecklistItemInputDto[];
}
