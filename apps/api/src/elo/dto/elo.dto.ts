import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class AskEloDto {
  @IsString() pergunta!: string;
  @IsOptional() @IsBoolean() modoAgente?: boolean;
}
