import { IsDateString, IsIn, IsUUID } from 'class-validator';

export class CreateExamDto {
  @IsUUID() employeeId!: string;
  @IsIn(['ADMISSIONAL', 'PERIODICO', 'RETORNO_TRABALHO', 'MUDANCA_FUNCAO', 'DEMISSIONAL'])
  tipo!: 'ADMISSIONAL' | 'PERIODICO' | 'RETORNO_TRABALHO' | 'MUDANCA_FUNCAO' | 'DEMISSIONAL';
  @IsDateString() dataPrevista!: string;
}

export class RegisterResultDto {
  @IsIn(['APTO', 'INAPTO']) resultado!: 'APTO' | 'INAPTO';
}
