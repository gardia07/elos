import { IsBoolean, IsDateString, IsOptional, IsString } from 'class-validator';

export class CreateDeadlineDto {
  @IsString() obrigacao!: string;
  @IsDateString() vencimento!: string;
}

export class UpdateDeadlineDto {
  @IsOptional() @IsBoolean() cumprido?: boolean;
}
