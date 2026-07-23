import { IsString, Length } from 'class-validator';

export class VerifyMfaDto {
  @IsString()
  loginTicket!: string;

  @IsString()
  @Length(6, 6)
  code!: string;
}
