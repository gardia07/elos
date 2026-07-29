import { IsString, Matches, MaxLength } from 'class-validator';

export class CreateRunDto {
  @Matches(/^\d{4}-(0[1-9]|1[0-2])$/, {
    message: 'competencia deve estar no formato AAAA-MM',
  })
  competencia!: string;
}

export class SaveImportTemplateDto {
  @IsString()
  @MaxLength(120)
  nome!: string;

  /** JSON.stringify de { headers: string[], mapeamento: ColumnMapping[] } */
  @IsString()
  mapeamento!: string;
}

export class CalcularCustoQueryDto {
  @Matches(/^\d{4}-(0[1-9]|1[0-2])$/, {
    message: 'competencia deve estar no formato AAAA-MM',
  })
  competencia!: string;
}
