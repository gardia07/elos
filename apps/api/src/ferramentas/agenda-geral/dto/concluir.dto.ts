import { IsIn, IsUUID } from 'class-validator';
import type { AgendaGeralOrigem } from '../agenda-geral.service';

const ORIGENS: AgendaGeralOrigem[] = [
  'AGENDA_ITEM',
  'LABOR_DEADLINE',
  'OCCUPATIONAL_EXAM',
  'NR_TRAINING',
  'VACATION_REQUEST',
  'TERMINATION',
  'TERMINATION_AVISO_FIM',
  'TERMINATION_PAGAMENTO',
  'DOCUMENT_REQUIREMENT',
];

export class ConcluirEventoDto {
  @IsIn(ORIGENS) origem!: AgendaGeralOrigem;
  @IsUUID() id!: string;
}
