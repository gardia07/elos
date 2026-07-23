import { Type } from 'class-transformer';
import { IsArray, IsBoolean, IsString, ValidateNested } from 'class-validator';

export class ToggleDocDto {
  @IsString() key!: string;
  @IsBoolean() checked!: boolean;
}

export class ChecklistItemInputDto {
  @IsString() key!: string;
  @IsString() nome!: string;
  @IsBoolean() ativo!: boolean;
}

export class SetChecklistConfigDto {
  @IsString() filial!: string;
  @IsArray() @ValidateNested({ each: true }) @Type(() => ChecklistItemInputDto) items!: ChecklistItemInputDto[];
}
