import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class CreatePolicyDto {
  @IsString() titulo!: string;
  @IsString() categoria!: string;
  @IsString() conteudo!: string;
}

export class UpdatePolicyDto {
  @IsOptional() @IsString() titulo?: string;
  @IsOptional() @IsString() categoria?: string;
  @IsOptional() @IsString() conteudo?: string;
  @IsOptional() @IsBoolean() ativo?: boolean;
}

export class AcknowledgePolicyDto {
  @IsString() employeeId!: string;
}
