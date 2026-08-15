import { Type } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsBoolean, IsDateString, IsIn, IsInt, IsOptional, IsString, IsUUID, Max, Min, ValidateNested } from 'class-validator';

const TIPOS = ['REUNIAO', 'PRAZO', 'TAREFA', 'PESSOAL', 'LEMBRETE'] as const;
export type AgendaItemTipo = (typeof TIPOS)[number];

const FREQUENCIAS = ['DIARIA', 'SEMANAL', 'MENSAL', 'ANUAL', 'PERSONALIZADA'] as const;
export type AgendaRecorrenciaFrequenciaDto = (typeof FREQUENCIAS)[number];
const DIAS_SEMANA = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SAB'] as const;

export class RecorrenciaInputDto {
  @IsIn(FREQUENCIAS) frequencia!: AgendaRecorrenciaFrequenciaDto;
  @IsOptional() @IsInt() @Min(1) intervalo?: number;
  @IsOptional() @IsArray() @ArrayMaxSize(7) @IsIn(DIAS_SEMANA, { each: true }) diasDaSemana?: string[];
  @IsOptional() @IsInt() @Min(-1) @Max(4) posicaoNoMes?: number;
  @IsDateString() dataFim!: string;
}

export class CreateAgendaItemDto {
  @IsDateString() data!: string;
  @IsOptional() @IsString() hora?: string;
  @IsOptional() @IsString() horaFim?: string;
  @IsString() descricao!: string;
  @IsOptional() @IsString() notas?: string;
  @IsOptional() @IsIn(TIPOS) tipo?: AgendaItemTipo;
  @IsOptional() @IsUUID() categoriaId?: string;
  @IsOptional() @ValidateNested() @Type(() => RecorrenciaInputDto) recorrencia?: RecorrenciaInputDto;
}

export class UpdateAgendaItemDto {
  @IsOptional() @IsDateString() data?: string;
  @IsOptional() @IsString() hora?: string;
  @IsOptional() @IsString() horaFim?: string;
  @IsOptional() @IsString() descricao?: string;
  @IsOptional() @IsBoolean() concluida?: boolean;
  @IsOptional() @IsString() notas?: string;
  @IsOptional() @IsIn(TIPOS) tipo?: AgendaItemTipo;
  @IsOptional() @IsUUID() categoriaId?: string;
}

export class SaveNotepadDto {
  @IsString() conteudo!: string;
}
