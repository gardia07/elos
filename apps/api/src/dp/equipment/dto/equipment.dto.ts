import { IsDateString, IsInt, IsString, IsUUID, Min } from 'class-validator';

export class CreateEquipmentDto {
  @IsUUID() employeeId!: string;
  @IsString() item!: string;
  @IsDateString() entregaEm!: string;
  @IsInt() @Min(1) validadeMeses!: number;
}
