import {
  IsEnum,
  IsString,
  IsBoolean,
  IsOptional,
  Matches,
} from 'class-validator';
import { DayOfWeek } from '@prisma/client';

export class SetAvailabilityDto {
  @IsEnum(DayOfWeek)
  dayOfWeek: DayOfWeek;

  @IsString()
  @Matches(/^\d{2}:\d{2}$/, { message: 'startTime must be HH:mm format' })
  startTime: string;

  @IsString()
  @Matches(/^\d{2}:\d{2}$/, { message: 'endTime must be HH:mm format' })
  endTime: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
