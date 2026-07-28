import { IsDateString, IsIn, IsNumber, IsOptional, IsString, IsUUID, Min } from 'class-validator';

export class CreateBeneficioTipoDto {
  @IsString() nome!: string;
  @IsIn(['ALIMENTACAO', 'ACADEMIA', 'SAUDE']) categoria!: 'ALIMENTACAO' | 'ACADEMIA' | 'SAUDE';
}

export class SetCoparticipacaoDto {
  @IsNumber() @Min(0) percentualEmpresa!: number;
  @IsNumber() @Min(0) percentualColab!: number;
}

export class CreateConvenioAcademiaDto {
  @IsString() nome!: string;
  @IsNumber() @Min(0) valorMensalidade!: number;
}

export class CreatePlanoSaudeDto {
  @IsString() nome!: string;
  @IsOptional() @IsString() operadora?: string;
}

export class CreateFaixaEtariaDto {
  @IsNumber() @Min(0) idadeMin!: number;
  @IsNumber() @Min(0) idadeMax!: number;
  @IsNumber() @Min(0) valor!: number;
}

export class CreateFeriadoDto {
  @IsDateString() data!: string;
  @IsIn(['NACIONAL', 'ESTADUAL', 'MUNICIPAL']) abrangencia!: 'NACIONAL' | 'ESTADUAL' | 'MUNICIPAL';
  @IsString() nome!: string;
  @IsOptional() @IsString() uf?: string;
  @IsOptional() @IsString() municipioIbge?: string;
}

export class CreateAdesaoValeDiarioDto {
  @IsUUID() beneficioTipoId!: string;
  @IsNumber() @Min(0) valorDiario!: number;
  @IsDateString() dataInicio!: string;
}

export class CreateAdesaoAcademiaDto {
  @IsUUID() convenioId!: string;
  @IsDateString() dataAdesao!: string;
}

export class CreateAdesaoPlanoSaudeDto {
  @IsUUID() planoId!: string;
  @IsDateString() dataAdesao!: string;
}

export class AddDependentePlanoSaudeDto {
  @IsString() nome!: string;
  @IsDateString() dataNascimento!: string;
  @IsOptional() @IsString() parentesco?: string;
}
