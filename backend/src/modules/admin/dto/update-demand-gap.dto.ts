import {
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export enum DemandGapAdminStatus {
  OPEN = 'OPEN',
  IN_PROGRESS = 'IN_PROGRESS',
  RESOLVED = 'RESOLVED',
  DISMISSED = 'DISMISSED',
}

export class UpdateDemandGapDto {
  @IsEnum(DemandGapAdminStatus)
  status: DemandGapAdminStatus;

  @IsOptional()
  @IsString()
  @MinLength(5)
  @MaxLength(500)
  note?: string;
}
