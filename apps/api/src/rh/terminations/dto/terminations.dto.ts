import { Type } from 'class-transformer';
import { IsArray, IsBoolean, IsDateString, IsIn, IsOptional, IsString, IsUUID, ValidateNested } from 'class-validator';

export class CreateTerminationDto {
  @IsUUID() employeeId!: string;
  @IsIn(['SEM_JUSTA_CAUSA', 'PEDIDO_DEMISSAO', 'ACORDO']) tipo!: 'SEM_JUSTA_CAUSA' | 'PEDIDO_DEMISSAO' | 'ACORDO';
  @IsDateString() data!: string;
  @IsOptional() @IsString() motivo?: string;
}

export class ToggleTerminationDocDto {
  @IsString() key!: string;
  @IsBoolean() checked!: boolean;
}

export class UpdateTerminationStatusDto {
  @IsIn(['EM_ANDAMENTO', 'CONCLUIDO']) status!: 'EM_ANDAMENTO' | 'CONCLUIDO';
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
}

export class SetTerminationChecklistDto {
  @IsArray() @ValidateNested({ each: true }) @Type(() => ChecklistItemInputDto) items!: ChecklistItemInputDto[];
}
