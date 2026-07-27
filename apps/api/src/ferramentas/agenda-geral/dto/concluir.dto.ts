import { IsIn, IsUUID } from 'class-validator';
import type { AgendaGeralOrigem } from '../agenda-geral.service';

const ORIGENS: AgendaGeralOrigem[] = ['AGENDA_ITEM', 'LABOR_DEADLINE', 'OCCUPATIONAL_EXAM', 'NR_TRAINING', 'VACATION_REQUEST', 'TERMINATION'];

export class ConcluirEventoDto {
  @IsIn(ORIGENS) origem!: AgendaGeralOrigem;
  @IsUUID() id!: string;
}
