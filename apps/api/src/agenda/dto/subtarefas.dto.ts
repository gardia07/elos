import { IsBoolean, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateSubtarefaDto {
  @IsString() @MinLength(1) titulo!: string;
}

export class UpdateSubtarefaDto {
  @IsOptional() @IsString() @MinLength(1) titulo?: string;
  @IsOptional() @IsBoolean() concluida?: boolean;
}
