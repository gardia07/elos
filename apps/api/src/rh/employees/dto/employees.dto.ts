import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsDateString, IsIn, IsInt, IsNumber, IsOptional, IsString, Min } from 'class-validator';

/** IsOptional() only skips validation for undefined/null — an empty string from a cleared date input still needs to pass IsDateString(), so blank it out to undefined first. */
const EmptyStringToUndefined = () => Transform(({ value }) => (value === '' ? undefined : value));

export class CreateEmployeeDto {
  @IsOptional() @IsString() matricula?: string;
  @IsString() nome!: string;
  @IsString() cargo!: string;
  @IsString() departamento!: string;
  @IsDateString() dataAdmissao!: string;
  @IsNumber() @Min(0) salario!: number;
  @IsOptional() @IsIn(['CLT', 'ESTAGIO', 'PJ']) tipoContrato?: 'CLT' | 'ESTAGIO' | 'PJ';
  @IsOptional() @IsString() filial?: string;
  @IsOptional() @IsString() email?: string;
  @IsOptional() @IsString() telefone?: string;
}

export class ListEmployeesQueryDto {
  @IsOptional() @IsString() nome?: string;
  @IsOptional() @IsString() departamento?: string;
  @IsOptional() @IsString() cargo?: string;
  @IsOptional() @IsString() filial?: string;
  @IsOptional() @IsIn(['CLT', 'ESTAGIO', 'PJ']) tipoContrato?: 'CLT' | 'ESTAGIO' | 'PJ';
  @IsOptional() @IsIn(['ATIVO', 'INATIVO']) status?: 'ATIVO' | 'INATIVO';
  @IsOptional() @IsDateString() admissaoDe?: string;
  @IsOptional() @IsDateString() admissaoAte?: string;
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  feriasVencendo?: boolean;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) tempoDeCasaMinAnos?: number;
}

export class UpdateEmployeeDto {
  // Contratuais
  @IsOptional() @IsString() matricula?: string;
  @IsOptional() @EmptyStringToUndefined() @IsDateString() dataAdmissao?: string;
  @IsOptional() @IsString() cargo?: string;
  @IsOptional() @IsString() departamento?: string;
  @IsOptional() @IsString() filial?: string;
  @IsOptional() @IsString() gestorDireto?: string;
  @IsOptional() @IsIn(['CLT', 'ESTAGIO', 'PJ']) tipoContrato?: 'CLT' | 'ESTAGIO' | 'PJ';

  // Contato
  @IsOptional() @IsString() email?: string;
  @IsOptional() @IsString() telefone?: string;
  @IsOptional() @IsString() endereco?: string;
  @IsOptional() @IsString() contatoEmergenciaNome?: string;
  @IsOptional() @IsString() contatoEmergenciaTelefone?: string;

  // Dados pessoais
  @IsOptional() @IsString() cpf?: string;
  @IsOptional() @IsString() rg?: string;
  @IsOptional() @EmptyStringToUndefined() @IsDateString() dataNascimento?: string;
  @IsOptional() @IsString() nacionalidade?: string;
  @IsOptional() @IsString() estadoCivil?: string;
  @IsOptional() @IsString() genero?: string;
  @IsOptional() @IsString() escolaridade?: string;
  @IsOptional() @IsString() cnh?: string;
  @IsOptional() @IsString() nomeMae?: string;
  @IsOptional() @IsString() nomePai?: string;
  @IsOptional() @IsString() pis?: string;
  @IsOptional() @IsString() ctps?: string;
  @IsOptional() @IsString() tituloEleitor?: string;

  // Cônjuge
  @IsOptional() @IsString() conjugeNome?: string;
  @IsOptional() @IsString() conjugeCpf?: string;
}

export class PromoteEmployeeDto {
  @IsString() cargo!: string;
  @IsNumber() @Min(0) salario!: number;
}

export class AddDependenteDto {
  @IsString() nome!: string;
  @IsString() parentesco!: string;
  @IsOptional() @IsString() cpf?: string;
  @IsOptional() @EmptyStringToUndefined() @IsDateString() dataNascimento?: string;
}

export class AddDocumentoDto {
  @IsString() nome!: string;
  @IsString() tipo!: string;
  @IsString() tamanho!: string;
}
