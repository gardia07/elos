import { IsArray, IsDateString, IsIn, IsOptional, IsString, IsUUID, MinLength } from 'class-validator';

const STATUS = ['PLANEJADO', 'EM_ANDAMENTO', 'CONCLUIDO', 'EM_RISCO', 'CANCELADO'] as const;
export type ProjetoStatusDto = (typeof STATUS)[number];

export class CreateProjetoDto {
  @IsString() @MinLength(1) nome!: string;
  @IsOptional() @IsString() descricao?: string;
  @IsDateString() dataInicio!: string;
  @IsOptional() @IsDateString() dataFim?: string;
  @IsOptional() @IsString() cor?: string;
  @IsOptional() @IsArray() @IsUUID('4', { each: true }) participanteIds?: string[];
}

export class UpdateProjetoDto {
  @IsOptional() @IsString() @MinLength(1) nome?: string;
  @IsOptional() @IsString() descricao?: string;
  @IsOptional() @IsDateString() dataInicio?: string;
  @IsOptional() @IsDateString() dataFim?: string;
  @IsOptional() @IsIn(STATUS) status?: ProjetoStatusDto;
  @IsOptional() @IsString() cor?: string;
}

export class SetParticipantesDto {
  @IsArray() @IsUUID('4', { each: true }) participanteIds!: string[];
}
