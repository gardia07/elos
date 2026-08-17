import { IsBoolean, IsDateString, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateMarcoDto {
  @IsString() @MinLength(1) titulo!: string;
  @IsDateString() data!: string;
}

export class UpdateMarcoDto {
  @IsOptional() @IsString() @MinLength(1) titulo?: string;
  @IsOptional() @IsDateString() data?: string;
  @IsOptional() @IsBoolean() concluido?: boolean;
}
