import { IsEnum, IsOptional, IsString } from 'class-validator';
import { FixerStatus } from '@prisma/client';

export class ApproveFixerDto {
  @IsEnum(FixerStatus)
  status: FixerStatus;

  @IsOptional()
  @IsString()
  note?: string;
}
