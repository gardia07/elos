import { IsOptional, IsString } from 'class-validator';

export class CreateJobGradeDto {
  @IsString() cargo!: string;
  @IsOptional() @IsString() cbo?: string;
  faixaMin!: number;
  faixaMax!: number;
  @IsString() nivel!: string;
  @IsOptional() @IsString() requisitos?: string;
}
