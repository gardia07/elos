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

  @IsIn(['SEM_JUSTA_CAUSA', 'PEDIDO_DEMISSAO', 'ACORDO'])
  tipo!: 'SEM_JUSTA_CAUSA' | 'PEDIDO_DEMISSAO' | 'ACORDO';

  @IsISO8601()
  dataPrevista!: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  saldoFgtsEstimado?: number;
}
