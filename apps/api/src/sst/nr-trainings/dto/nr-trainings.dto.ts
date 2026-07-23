import { IsDateString, IsInt, IsString, IsUUID, Min } from 'class-validator';

export class CreateNrTrainingDto {
  @IsUUID() employeeId!: string;
  @IsString() curso!: string;
  @IsDateString() dataRealizacao!: string;
  @IsInt() @Min(1) validadeMeses!: number;
}
