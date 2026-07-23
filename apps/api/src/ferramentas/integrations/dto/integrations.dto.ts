import { IsBoolean } from 'class-validator';

export class ToggleIntegrationDto {
  @IsBoolean() conectado!: boolean;
}
