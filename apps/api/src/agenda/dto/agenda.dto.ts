import { IsBoolean, IsDateString, IsOptional, IsString } from 'class-validator';

export class CreateAgendaItemDto {
  @IsDateString() data!: string;
  @IsOptional() @IsString() hora?: string;
  @IsString() descricao!: string;
}

export class UpdateAgendaItemDto {
  @IsBoolean() concluida!: boolean;
}

export class SaveNotepadDto {
  @IsString() conteudo!: string;
}
