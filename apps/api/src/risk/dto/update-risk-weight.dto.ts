import { IsBoolean, IsInt, IsOptional, Max, Min } from 'class-validator';

export class UpdateRiskWeightDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  impacto?: number;

  @IsOptional()
  @IsBoolean()
  ativo?: boolean;
}
