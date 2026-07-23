import { IsDecimal, IsEnum, IsIn, IsNumber, IsOptional, IsString, IsUUID, MinLength } from 'class-validator';

export class CreateJobDto {
  @IsString() @MinLength(2) cargo!: string;
  @IsString() @MinLength(2) depto!: string;
  @IsIn(['CLT', 'ESTAGIO']) contrato!: 'CLT' | 'ESTAGIO';
}

export class CreateCandidateDto {
  @IsString() @MinLength(2) nome!: string;
  @IsOptional() @IsString() origem?: string;
}

export class RejectCandidateDto {
  @IsOptional() @IsString() motivo?: string;
}

export class BlockCandidateDto {
  @IsOptional() @IsString() motivo?: string;
}

export class UpdateScorecardDto {
  comunicacao!: number;
  tecnica!: number;
  cultura!: number;
}

export class UpdateCandidateDto {
  @IsOptional() @IsString() email?: string;
  @IsOptional() @IsString() telefone?: string;
  @IsOptional() @IsString() resumo?: string;
  @IsOptional() @IsString() notas?: string;
}

export class CreateJobCostDto {
  @IsString() categoria!: string;
  @IsOptional() @IsString() descricao?: string;
  valor!: number;
}

export class CreateRequisitionDto {
  @IsString() cargo!: string;
  @IsString() solicitante!: string;
  @IsString() depto!: string;
  @IsOptional() @IsIn(['CLT', 'ESTAGIO']) contrato?: 'CLT' | 'ESTAGIO';
  @IsOptional() @IsNumber() faixaSalarial?: number;
  @IsOptional() @IsIn(['Baixa', 'Normal', 'Alta']) prioridade?: string;
}

export class ScheduleInterviewDto {
  @IsUUID() candidateId!: string;
  @IsString() dataLabel!: string;
  @IsString() hora!: string;
}
