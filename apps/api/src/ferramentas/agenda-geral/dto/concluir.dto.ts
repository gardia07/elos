import { IsIn, IsString } from 'class-validator';
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
  'ANIVERSARIO_COLABORADOR',
  'ANIVERSARIO_ADMISSAO',
];

export class ConcluirEventoDto {
  @IsIn(ORIGENS) origem!: AgendaGeralOrigem;
  // Nem todo id de evento agregado é um UUID puro (ex.: aniversários usam `${employeeId}-nascimento`), então aceitamos string livre aqui — a validação de formato de fato acontece dentro de cada branch de AgendaGeralService.concluir.
  @IsString() id!: string;
}
