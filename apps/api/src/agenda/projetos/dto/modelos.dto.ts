import { IsString, MinLength } from 'class-validator';

export class SalvarComoModeloDto {
  @IsString() @MinLength(1) nome!: string;
}
