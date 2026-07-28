import { IsDateString, IsIn, IsNumber, IsOptional, IsString, IsUUID, Min } from 'class-validator';

export class CreateBeneficioTipoDto {
  @IsString() nome!: string;
  @IsIn(['ALIMENTACAO', 'ACADEMIA', 'SAUDE', 'OUTRO']) categoria!: 'ALIMENTACAO' | 'ACADEMIA' | 'SAUDE' | 'OUTRO';
}

export class UpdateBeneficioTipoDto {
  @IsString() nome!: string;
}

export class SetCoparticipacaoDto {
  @IsNumber() @Min(0) percentualEmpresa!: number;
  @IsNumber() @Min(0) percentualColab!: number;
}

export class CreateConvenioAcademiaDto {
  @IsString() nome!: string;
  @IsNumber() @Min(0) valorMensalidade!: number;
}

export class UpdateConvenioAcademiaDto {
  @IsOptional() @IsString() nome?: string;
  @IsOptional() @IsNumber() @Min(0) valorMensalidade?: number;
}

export class CreatePlanoSaudeDto {
  @IsString() nome!: string;
  @IsOptional() @IsString() operadora?: string;
}

export class UpdatePlanoSaudeDto {
  @IsOptional() @IsString() nome?: string;
  @IsOptional() @IsString() operadora?: string;
}

export class CreateFaixaEtariaDto {
  @IsNumber() @Min(0) idadeMin!: number;
  @IsNumber() @Min(0) idadeMax!: number;
  @IsNumber() @Min(0) valor!: number;
}

export class UpdateFaixaEtariaDto {
  @IsOptional() @IsNumber() @Min(0) idadeMin?: number;
  @IsOptional() @IsNumber() @Min(0) idadeMax?: number;
  @IsOptional() @IsNumber() @Min(0) valor?: number;
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

export class UpdateAdesaoValeDiarioDto {
  @IsNumber() @Min(0) valorDiario!: number;
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

export class CreateAdesaoBeneficioFixoDto {
  @IsUUID() beneficioTipoId!: string;
  @IsNumber() @Min(0) valorMensal!: number;
  @IsDateString() dataInicio!: string;
}

export class UpdateAdesaoBeneficioFixoDto {
  @IsNumber() @Min(0) valorMensal!: number;
}

export class CalcularApuracaoDto {
  @IsString() competencia!: string; // "2026-07"
}
