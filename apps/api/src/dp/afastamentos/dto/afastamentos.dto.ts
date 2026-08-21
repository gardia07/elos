import { IsDateString, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateAfastamentoDto {
  @IsUUID() employeeId!: string;
  @IsUUID() motivoAfastamentoId!: string;
  @IsDateString() inicio!: string;
  @IsOptional() @IsDateString() dataFimPrevista?: string;
  /// Obrigatório quando o motivo exige CID -- validado no service, não aqui, porque depende do motivo escolhido.
  @IsOptional() @IsString() cid?: string;
  @IsOptional() @IsString() cidDescricao?: string;
  @IsOptional() @IsString() medicoNome?: string;
  @IsOptional() @IsString() medicoCrm?: string;
}

export class RegistrarRetornoAfastamentoDto {
  @IsDateString() retorno!: string;
}
