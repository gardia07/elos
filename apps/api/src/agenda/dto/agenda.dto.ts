import { IsBoolean, IsDateString, IsIn, IsOptional, IsString, IsUUID } from 'class-validator';

const TIPOS = ['REUNIAO', 'PRAZO', 'TAREFA', 'PESSOAL', 'LEMBRETE'] as const;
export type AgendaItemTipo = (typeof TIPOS)[number];

export class CreateAgendaItemDto {
  @IsDateString() data!: string;
  @IsOptional() @IsString() hora?: string;
  @IsOptional() @IsString() horaFim?: string;
  @IsString() descricao!: string;
  @IsOptional() @IsString() notas?: string;
  @IsOptional() @IsIn(TIPOS) tipo?: AgendaItemTipo;
  @IsOptional() @IsUUID() categoriaId?: string;
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
