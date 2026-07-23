import { IsArray, IsBoolean, IsIn, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class CreateDocumentRequirementDto {
  @IsString() nome!: string;
  @IsString() categoria!: string;
  @IsOptional() @IsBoolean() obrigatorio?: boolean;
  @IsOptional() @IsInt() @Min(1) validadeDias?: number;
  @IsOptional() @IsArray() @IsString({ each: true }) aplicaStatus?: string[];
  @IsOptional() @IsArray() @IsString({ each: true }) aplicaTipoContrato?: string[];
  @IsOptional() @IsArray() @IsString({ each: true }) aplicaDepartamento?: string[];
  @IsOptional() @IsArray() @IsString({ each: true }) aplicaCargo?: string[];
}

export class UpdateDocumentRequirementDto {
  @IsOptional() @IsString() nome?: string;
  @IsOptional() @IsString() categoria?: string;
  @IsOptional() @IsBoolean() obrigatorio?: boolean;
  @IsOptional() @IsBoolean() ativo?: boolean;
  @IsOptional() @IsInt() @Min(1) validadeDias?: number;
  @IsOptional() @IsArray() @IsString({ each: true }) aplicaStatus?: string[];
  @IsOptional() @IsArray() @IsString({ each: true }) aplicaTipoContrato?: string[];
  @IsOptional() @IsArray() @IsString({ each: true }) aplicaDepartamento?: string[];
  @IsOptional() @IsArray() @IsString({ each: true }) aplicaCargo?: string[];
}

export class SetDocumentStatusDto {
  @IsIn(['MISSING', 'PENDING', 'COMPLIANT', 'EXPIRED', 'REJECTED']) status!: 'MISSING' | 'PENDING' | 'COMPLIANT' | 'EXPIRED' | 'REJECTED';
  @IsOptional() @IsString() observacao?: string;
}
