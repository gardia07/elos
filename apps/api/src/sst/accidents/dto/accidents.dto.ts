import { IsBoolean, IsDateString, IsIn, IsInt, IsOptional, IsString, IsUUID, Min } from 'class-validator';

export class CreateAccidentDto {
  @IsUUID() employeeId!: string;
  @IsIn(['TIPICO', 'TRAJETO', 'DOENCA_OCUPACIONAL']) tipoAcidente!: 'TIPICO' | 'TRAJETO' | 'DOENCA_OCUPACIONAL';
  @IsOptional() @IsBoolean() comAfastamento?: boolean;
  @IsOptional() @IsInt() @Min(0) diasAfastamento?: number;
  @IsDateString() dataAcidente!: string;
  @IsDateString() dataEmissaoCat!: string;
  @IsOptional() @IsString() descricao?: string;
}

export class UpdateInvestigationDto {
  @IsOptional() @IsString() causaRaiz?: string;
  @IsOptional() @IsString() acaoCorretiva?: string;
}

export class CloseAccidentDto {
  @IsOptional() @IsString() notaEncerramento?: string;
}
