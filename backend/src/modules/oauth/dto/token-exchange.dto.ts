import { IsOptional, IsString } from 'class-validator';

export class TokenExchangeDto {
  @IsString()
  grant_type!: string;

  @IsString()
  subject_token_type!: string;

  @IsString()
  subject_token!: string;

  @IsString()
  audience!: string;

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
