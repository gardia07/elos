import { IsIn, IsInt, IsISO8601, IsOptional, IsString, Min } from 'class-validator';

const STATUSES = ['TRIAL', 'ATIVA', 'SUSPENSA', 'CANCELADA', 'EXPIRADA'] as const;

export class UpdateLicenseDto {
  @IsOptional() @IsString() planCode?: string;
  @IsOptional() @IsIn(STATUSES) status?: (typeof STATUSES)[number];
  @IsOptional() @IsISO8601() expiraEm?: string;
  @IsOptional() @IsInt() @Min(0) maxUsuarios?: number;
  @IsOptional() @IsInt() @Min(0) maxColaboradores?: number;
  @IsOptional() @IsString() observacoes?: string;
}
