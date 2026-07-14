import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class FixerWorkflowActionDto {
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  note?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  rating?: number;

  @IsOptional()
  @IsIn(['payment', 'free-pass'])
  feeMode?: 'payment' | 'free-pass';

  @IsOptional()
  @IsString()
  @MaxLength(32)
  meetingDate?: string;

  @IsOptional()
  @IsString()
  @MaxLength(16)
  meetingTime?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  meetingVenue?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  workflowVersion?: number;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  idempotencyKey?: string;
}
