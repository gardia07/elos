import { Type } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsBoolean, IsDateString, IsIn, IsInt, IsOptional, IsString, IsUUID, Max, Min, MinLength, ValidateNested } from 'class-validator';

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

const ANTECEDENCIAS = [0, 1, 7] as const;

export class LembreteInputDto {
  @IsArray() @ArrayMaxSize(3) @IsIn(ANTECEDENCIAS, { each: true }) antecedencias!: number[];
  @IsOptional() @IsBoolean() email?: boolean;
}

export class CreateAgendaItemDto {
  @IsDateString() data!: string;
  @IsOptional() @IsString() hora?: string;
  @IsOptional() @IsString() horaFim?: string;
  @IsString() descricao!: string;
  @IsOptional() @IsString() notas?: string;
  @IsOptional() @IsIn(TIPOS) tipo?: AgendaItemTipo;
  @IsOptional() @IsUUID() categoriaId?: string;
  @IsOptional() @IsUUID() responsavelId?: string;
  @IsOptional() @IsUUID() projetoId?: string;
  @IsOptional() @ValidateNested() @Type(() => RecorrenciaInputDto) recorrencia?: RecorrenciaInputDto;
  @IsOptional() @ValidateNested() @Type(() => LembreteInputDto) lembretes?: LembreteInputDto;
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
  @IsOptional() @IsUUID() responsavelId?: string;
  @IsOptional() @IsUUID() projetoId?: string;
  @IsOptional() @ValidateNested() @Type(() => LembreteInputDto) lembretes?: LembreteInputDto;
}

export class SaveNotepadDto {
  @IsString() conteudo!: string;
}

export class CreateComentarioDto {
  @IsString() @MinLength(1) texto!: string;
}

export class SaveRevisaoDto {
  @IsString() reflexao!: string;
}
