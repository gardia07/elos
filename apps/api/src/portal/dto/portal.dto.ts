import { IsDateString } from 'class-validator';

export class RequestPortalVacationDto {
  @IsDateString() inicio!: string;
  @IsDateString() fim!: string;
}
