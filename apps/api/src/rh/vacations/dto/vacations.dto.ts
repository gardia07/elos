import {
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';

export class CreateVacationRequestDto {
  @IsUUID() employeeId!: string;
  @IsDateString() inicio!: string;
  @IsDateString() fim!: string;
  @IsOptional() @IsInt() @Min(0) @Max(10) diasAbono?: number;
}

export class CreateLeaveDto {
  @IsUUID() employeeId!: string;
  @IsString() tipo!: string;
  @IsDateString() inicio!: string;
  @IsOptional() @IsDateString() fim?: string;
}
