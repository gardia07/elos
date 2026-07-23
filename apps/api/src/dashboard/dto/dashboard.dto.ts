import { IsIn, IsISO8601, IsOptional, IsString } from 'class-validator';

export class CreateTaskDto {
  @IsString() titulo!: string;
  @IsString() modulo!: string;
  @IsOptional() @IsIn(['BAIXA', 'MEDIA', 'ALTA', 'CRITICA']) prioridade?: 'BAIXA' | 'MEDIA' | 'ALTA' | 'CRITICA';
  @IsOptional() @IsISO8601() prazo?: string;
}

export class UpdateTaskStatusDto {
  @IsIn(['ABERTA', 'CONCLUIDA']) status!: 'ABERTA' | 'CONCLUIDA';
}
