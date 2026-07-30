import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

/** IsOptional() only skips validation for undefined/null — an empty string from a cleared date input still needs to pass IsDateString(), so blank it out to undefined first. */
const EmptyStringToUndefined = () =>
  Transform(({ value }) => (value === '' ? undefined : value));

const CNH_CATEGORIAS = ['A', 'B', 'AB', 'C', 'AC', 'D', 'AD', 'E', 'AE'] as const;
type CnhCategoria = (typeof CNH_CATEGORIAS)[number];

export class CreateEmployeeDto {
  @IsOptional() @IsString() matricula?: string;
  @IsString() nome!: string;
  @IsString() cargo!: string;
  @IsString() departamento!: string;
  @IsDateString() dataAdmissao!: string;
  @IsNumber() @Min(0) salario!: number;
  @IsOptional() @IsIn(['CLT', 'ESTAGIO', 'PJ', 'INTERMITENTE']) tipoContrato?:
    'CLT' | 'ESTAGIO' | 'PJ' | 'INTERMITENTE';
  @IsOptional() @IsIn(['MENSALISTA', 'HORISTA', 'DIARISTA']) tipoSalario?:
    'MENSALISTA' | 'HORISTA' | 'DIARISTA';
  @IsOptional() @IsString() filial?: string;
  @IsOptional() @IsString() email?: string;
  @IsOptional() @IsString() telefone?: string;
}

export class ListEmployeesQueryDto {
  @IsOptional() @IsString() nome?: string;
  @IsOptional() @IsString() departamento?: string;
  @IsOptional() @IsString() cargo?: string;
  @IsOptional() @IsString() filial?: string;
  @IsOptional() @IsIn(['CLT', 'ESTAGIO', 'PJ', 'INTERMITENTE']) tipoContrato?:
    'CLT' | 'ESTAGIO' | 'PJ' | 'INTERMITENTE';
  @IsOptional() @IsIn(['MENSALISTA', 'HORISTA', 'DIARISTA']) tipoSalario?:
    'MENSALISTA' | 'HORISTA' | 'DIARISTA';
  @IsOptional() @IsIn(['ATIVO', 'INATIVO']) status?: 'ATIVO' | 'INATIVO';
  @IsOptional() @IsDateString() admissaoDe?: string;
  @IsOptional() @IsDateString() admissaoAte?: string;
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  feriasVencendo?: boolean;
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  tempoDeCasaMinAnos?: number;
}

export class UpdateEmployeeDto {
  // Contratuais
  @IsOptional() @IsString() matricula?: string;
  @IsOptional() @EmptyStringToUndefined() @IsDateString() dataAdmissao?: string;
  @IsOptional() @IsString() cargo?: string;
  @IsOptional() @IsString() departamento?: string;
  @IsOptional() @IsString() filial?: string;
  @IsOptional() @IsString() gestorDireto?: string;
  @IsOptional() @IsIn(['CLT', 'ESTAGIO', 'PJ', 'INTERMITENTE']) tipoContrato?:
    'CLT' | 'ESTAGIO' | 'PJ' | 'INTERMITENTE';
  @IsOptional() @IsIn(['MENSALISTA', 'HORISTA', 'DIARISTA']) tipoSalario?:
    'MENSALISTA' | 'HORISTA' | 'DIARISTA';
  @IsOptional() @IsNumber() @Min(0) salario?: number;
  @IsOptional() @IsString() motivoAlteracaoSalario?: string;
  @IsOptional()
  @EmptyStringToUndefined()
  @IsDateString()
  salarioVigenciaDesde?: string;

  // Dados bancários
  @IsOptional() @IsString() banco?: string;
  @IsOptional() @IsString() agencia?: string;
  @IsOptional() @IsString() conta?: string;
  @IsOptional() @IsIn(['CORRENTE', 'POUPANCA']) tipoConta?:
    'CORRENTE' | 'POUPANCA';
  @IsOptional() @IsString() chavePix?: string;

  // Contato
  @IsOptional() @IsString() email?: string;
  @IsOptional() @IsString() telefone?: string;
  @IsOptional() @IsString() endereco?: string;

  // Dados pessoais
  @IsOptional() @IsString() cpf?: string;
  @IsOptional() @IsString() rg?: string;
  @IsOptional() @IsString() rgOrgaoExpedidor?: string;
  @IsOptional()
  @EmptyStringToUndefined()
  @IsDateString()
  rgDataExpedicao?: string;
  @IsOptional()
  @EmptyStringToUndefined()
  @IsDateString()
  dataNascimento?: string;
  @IsOptional() @IsString() nacionalidade?: string;
  @IsOptional() @IsString() estadoCivil?: string;
  @IsOptional() @IsString() genero?: string;
  @IsOptional() @IsString() escolaridade?: string;
  @IsOptional() @IsString() cnh?: string;
  @IsOptional() @IsIn(CNH_CATEGORIAS) cnhCategoria?: CnhCategoria;
  @IsOptional() @EmptyStringToUndefined() @IsDateString() cnhValidade?: string;
  @IsOptional() @IsString() nomeMae?: string;
  @IsOptional() @IsString() nomePai?: string;
  @IsOptional() @IsString() pis?: string;
  @IsOptional() @IsString() ctps?: string;
  @IsOptional() @IsString() tituloEleitor?: string;
  @IsOptional() @IsString() tituloEleitorZona?: string;
  @IsOptional() @IsString() tituloEleitorSecao?: string;
  @IsOptional() @IsString() racaCor?: string;
  @IsOptional() @IsBoolean() pcd?: boolean;

  // Cônjuge
  @IsOptional() @IsString() conjugeNome?: string;
  @IsOptional() @IsString() conjugeCpf?: string;
  @IsOptional() @IsBoolean() semDependentes?: boolean;
}

export class AddContatoEmergenciaDto {
  @IsString() nome!: string;
  @IsString() parentesco!: string;
  @IsOptional() @IsString() telefone?: string;
}

export class PromoteEmployeeDto {
  @IsOptional() @IsString() cargo?: string;
  @IsNumber() @Min(0) salario!: number;
  @IsIn(['Promoção', 'Reajuste anual', 'Dissídio coletivo', 'Outro']) motivo!:
    'Promoção' | 'Reajuste anual' | 'Dissídio coletivo' | 'Outro';
  @IsOptional()
  @EmptyStringToUndefined()
  @IsDateString()
  vigenciaDesde?: string;
}

export class UpdateCargoSalarioHistoricoDto {
  @IsOptional() @EmptyStringToUndefined() @IsDateString() vigenciaDesde?: string;
  @IsOptional() @IsString() cargo?: string;
  @IsOptional() @IsNumber() @Min(0) salario?: number;
  @IsString() motivoCorrecao!: string;
}

export class RemoveCargoSalarioHistoricoDto {
  @IsString() motivoCorrecao!: string;
}

export class AddDependenteDto {
  @IsString() nome!: string;
  @IsString() parentesco!: string;
  @IsString() cpf!: string;
  @IsOptional()
  @EmptyStringToUndefined()
  @IsDateString()
  dataNascimento?: string;
}
