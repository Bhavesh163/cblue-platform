import {
  IsBoolean,
  IsISO8601,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class QualificationComplianceAccessDto {
  @IsString()
  @MinLength(10)
  @MaxLength(500)
  purpose!: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  caseReference?: string;

  @IsOptional()
  @IsBoolean()
  legalHold?: boolean;

  @IsOptional()
  @IsISO8601()
  legalHoldUntil?: string;
}
