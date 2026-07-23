import { IsBoolean, IsDateString, IsIn, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';

export class CreateCycleDto {
  @IsString() nome!: string;
  @IsDateString() periodoInicio!: string;
  @IsDateString() periodoFim!: string;
  @IsIn(['NOVENTA', 'CENTO_OITENTA', 'TRESSESSENTA']) modelo!: 'NOVENTA' | 'CENTO_OITENTA' | 'TRESSESSENTA';
}

export class UpsertRecordDto {
  @IsOptional() @Min(0) @Max(5) autoNota?: number;
  @IsOptional() @Min(0) @Max(5) gestorNota?: number;
}

export class CreateGoalDto {
  @IsUUID() employeeId!: string;
  @IsString() texto!: string;
}

export class UpdateGoalDto {
  @IsIn(['EM_ANDAMENTO', 'CONCLUIDA']) status!: 'EM_ANDAMENTO' | 'CONCLUIDA';
}

export class CreatePdiActionDto {
  @IsString() texto!: string;
  @IsDateString() prazo!: string;
}

export class UpdatePdiActionDto {
  @IsBoolean() done!: boolean;
}
