import { IsEmail, IsIn, IsOptional, IsString, IsUUID, MinLength } from 'class-validator';

const REGIMES_TRIBUTARIOS = ['SIMPLES_NACIONAL', 'LUCRO_PRESUMIDO', 'LUCRO_REAL'] as const;

export class UpdateTenantDto {
  @IsOptional() @IsString() razaoSocial?: string;
  @IsOptional() @IsString() cnpj?: string;
  @IsOptional() @IsString() inscricaoEstadual?: string;
  @IsOptional() @IsString() inscricaoMunicipal?: string;
  @IsOptional() @IsString() cnae?: string;
  @IsOptional() @IsIn(REGIMES_TRIBUTARIOS) regimeTributario?: (typeof REGIMES_TRIBUTARIOS)[number];
  @IsOptional() @IsString() cep?: string;
  @IsOptional() @IsString() logradouro?: string;
  @IsOptional() @IsString() numero?: string;
  @IsOptional() @IsString() complemento?: string;
  @IsOptional() @IsString() bairro?: string;
  @IsOptional() @IsString() cidade?: string;
  @IsOptional() @IsString() uf?: string;
  @IsOptional() @IsString() representanteLegalNome?: string;
  @IsOptional() @IsString() representanteLegalCpf?: string;
  @IsOptional() @IsString() representanteLegalCargo?: string;
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
