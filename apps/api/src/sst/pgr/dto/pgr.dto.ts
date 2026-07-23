import { IsDateString, IsIn, IsString } from 'class-validator';

export class CreatePgrActionDto {
  @IsString() acao!: string;
  @IsString() setor!: string;
  @IsDateString() prazo!: string;
}

export class UpdatePgrActionDto {
  @IsIn(['PLANEJADA', 'EM_ANDAMENTO', 'CONCLUIDA']) status!: 'PLANEJADA' | 'EM_ANDAMENTO' | 'CONCLUIDA';
}
