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

export class ExitInterviewDto {
  @IsOptional() @IsString() entrevistaMotivo?: string;
  @IsOptional() @IsString() entrevistaObs?: string;
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
