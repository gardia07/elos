import { IsEmail, IsIn, IsOptional, IsString, IsUUID, MinLength } from 'class-validator';

export class UpdateTenantDto {
  @IsOptional() @IsString() razaoSocial?: string;
  @IsOptional() @IsString() cnpj?: string;
}

const ROLES = ['ADMIN', 'RH_GENERALISTA', 'GESTOR_AREA', 'COLABORADOR', 'COMPLIANCE', 'COMITE_ETICA', 'PSICOLOGIA'] as const;

export class UpdateUserRoleDto {
  @IsIn(ROLES) role!: (typeof ROLES)[number];
}

export class CreateUserDto {
  @IsString() name!: string;
  @IsEmail() email!: string;
  @MinLength(8) password!: string;
  @IsOptional() @IsIn(ROLES) role?: (typeof ROLES)[number];
  @IsOptional() @IsUUID() employeeId?: string;
}
