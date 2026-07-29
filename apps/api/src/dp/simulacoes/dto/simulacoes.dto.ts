import {
  IsIn,
  IsInt,
  IsISO8601,
  IsNumber,
  IsOptional,
  IsUUID,
  Max,
  Min,
} from 'class-validator';
import type { TipoRescisao } from '../constantes-trabalhistas';

const TIPOS_RESCISAO: TipoRescisao[] = [
  'SEM_JUSTA_CAUSA',
  'PEDIDO_DEMISSAO',
  'ACORDO',
  'JUSTA_CAUSA',
  'ACORDO_MUTUO',
  'FIM_CONTRATO_EXPERIENCIA',
  'APOSENTADORIA',
  'RESCISAO_INDIRETA',
  'OBITO',
];

export class SimularFeriasDto {
  @IsUUID()
  employeeId!: string;

  @IsInt()
  @Min(1)
  @Max(30)
  dias!: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(10)
  abonoDias?: number;
}

export class SimularRescisaoDto {
  @IsUUID()
  employeeId!: string;

  @IsIn(TIPOS_RESCISAO)
  tipo!: TipoRescisao;

  @IsISO8601()
  dataPrevista!: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  saldoFgtsEstimado?: number;
}
