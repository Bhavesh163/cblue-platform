import { IsOptional, IsString } from 'class-validator';

export class TokenExchangeDto {
  @IsString()
  grant_type!: string;

  @IsOptional()
  @IsString()
  subject_token_type?: string;

  @IsOptional()
  @IsString()
  subject_token?: string;

  @IsOptional()
  @IsString()
  audience?: string;

  @IsOptional()
  @IsString()
  refresh_token?: string;

  @IsOptional()
  @IsString()
  client_id?: string;

  @IsOptional()
  @IsString()
  client_secret?: string;

  @IsOptional()
  @IsString()
  scope?: string;
}
