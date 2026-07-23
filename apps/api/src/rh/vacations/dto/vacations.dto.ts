import { IsDateString, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateVacationRequestDto {
  @IsUUID() employeeId!: string;
  @IsDateString() inicio!: string;
  @IsDateString() fim!: string;
}

export class CreateLeaveDto {
  @IsUUID() employeeId!: string;
  @IsString() tipo!: string;
  @IsDateString() inicio!: string;
  @IsOptional() @IsDateString() fim?: string;
}
