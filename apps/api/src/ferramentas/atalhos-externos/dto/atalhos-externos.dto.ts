import { IsOptional, IsString, IsUrl, MinLength } from 'class-validator';

export class CreateAtalhoDto {
  @IsString() @MinLength(1) nome!: string;
  @IsUrl({ require_protocol: true }) url!: string;
  @IsOptional() @IsString() icone?: string;
}

export class UpdateAtalhoDto {
  @IsOptional() @IsString() @MinLength(1) nome?: string;
  @IsOptional() @IsUrl({ require_protocol: true }) url?: string;
  @IsOptional() @IsString() icone?: string;
}
