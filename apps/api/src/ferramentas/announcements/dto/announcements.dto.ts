import { IsString } from 'class-validator';

export class CreateAnnouncementDto {
  @IsString() titulo!: string;
  @IsString() corpo!: string;
}
