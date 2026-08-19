import { IsIn, IsString, IsUUID, MinLength } from 'class-validator';

export const ADIAR_DIAS = [1, 3, 7] as const;
export type AdiarDiasDto = (typeof ADIAR_DIAS)[number];

export class CriarTarefaManualDto {
  @IsString() @MinLength(1) titulo!: string;
}

export class AdiarDto {
  @IsIn(ADIAR_DIAS) dias!: AdiarDiasDto;
}

export class DelegarDto {
  @IsUUID() userId!: string;
}
