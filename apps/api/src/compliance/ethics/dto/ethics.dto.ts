import { IsBoolean, IsIn, IsOptional, IsString } from 'class-validator';

const CATEGORIAS = ['ASSEDIO', 'DISCRIMINACAO', 'FRAUDE', 'CONFLITO_INTERESSE', 'OUTRO'] as const;

export class CreateEthicsCaseDto {
  @IsIn(CATEGORIAS) categoria!: (typeof CATEGORIAS)[number];
  @IsString() descricao!: string;
  @IsOptional() @IsBoolean() anonimo?: boolean;
  @IsOptional() @IsString() denuncianteNome?: string;
}

export class UpdateEthicsCaseStatusDto {
  @IsIn(['ABERTO', 'EM_INVESTIGACAO', 'CONCLUIDO']) status!: 'ABERTO' | 'EM_INVESTIGACAO' | 'CONCLUIDO';
  @IsOptional() @IsString() conclusao?: string;
}
