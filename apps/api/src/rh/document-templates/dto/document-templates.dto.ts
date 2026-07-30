import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class UpdateDocumentTemplateDto {
  @IsOptional() @IsString() nome?: string;
  @IsOptional() @IsString() corpo?: string;
  @IsOptional() @IsBoolean() ativo?: boolean;
}
