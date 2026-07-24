import { IsOptional, IsString } from 'class-validator';

export class CreateDepartmentDto {
  @IsString() nome!: string;
  @IsOptional() @IsString() descricao?: string;
}
