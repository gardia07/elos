import { IsIn, IsString } from 'class-validator';

export class CreateRiskMapEntryDto {
  @IsString() setor!: string;
  @IsString() riscos!: string;
  @IsIn(['ALTO', 'MEDIO', 'BAIXO']) nivel!: 'ALTO' | 'MEDIO' | 'BAIXO';
}
