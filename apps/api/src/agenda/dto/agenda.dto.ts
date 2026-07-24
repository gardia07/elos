import { IsBoolean, IsDateString, IsIn, IsOptional, IsString } from 'class-validator';

const TIPOS = ['REUNIAO', 'PRAZO', 'TAREFA', 'PESSOAL'] as const;
export type AgendaItemTipo = (typeof TIPOS)[number];

export class CreateAgendaItemDto {
  @IsDateString() data!: string;
  @IsOptional() @IsString() hora?: string;
  @IsString() descricao!: string;
  @IsOptional() @IsIn(TIPOS) tipo?: AgendaItemTipo;
}

export class UpdateAgendaItemDto {
  @IsOptional() @IsBoolean() concluida?: boolean;
  @IsOptional() @IsIn(TIPOS) tipo?: AgendaItemTipo;
}

export class SaveNotepadDto {
  @IsString() conteudo!: string;
}
