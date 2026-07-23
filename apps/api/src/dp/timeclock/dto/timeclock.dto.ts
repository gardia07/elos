import { IsDateString, IsString, IsUUID } from 'class-validator';

export class CreateJustificationDto {
  @IsUUID() employeeId!: string;
  @IsDateString() data!: string;
  @IsString() ocorrencia!: string;
}
