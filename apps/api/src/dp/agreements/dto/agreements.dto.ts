import { IsDateString, IsOptional, IsString, Max, Min } from 'class-validator';

export class CreateAgreementDto {
  @IsString() sindicato!: string;
  @IsDateString() vigenciaInicio!: string;
  @IsDateString() vigenciaFim!: string;
  @Min(0) @Max(100) reajustePercentual!: number;
  @IsOptional() @IsString() clausulas?: string;
}

export class ApplyReajusteDto {
  @IsOptional() @IsString() departamento?: string;
}
