import { IsString, IsUUID } from 'class-validator';

export class CreateBenefitDto {
  @IsString() nome!: string;
  @IsString() elegibilidade!: string;
  custoMensal!: number;
}

export class EnrollDto {
  @IsUUID() employeeId!: string;
}
