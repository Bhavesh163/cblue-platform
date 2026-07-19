import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsInt,
  IsOptional,
  IsNumber,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

export class FixerWorkflowVariationItemDto {
  @IsString()
  @MaxLength(200)
  service: string;

  @IsNumber()
  @Min(0.000001)
  quantity: number;

  @IsString()
  @MaxLength(50)
  unit: string;

  @IsNumber()
  @Min(0)
  unitRate: number;

  @IsNumber()
  @Min(0)
  total: number;
}

export class FixerWorkflowActionDto {
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  note?: string;
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(30)
  @ValidateNested({ each: true })
  @Type(() => FixerWorkflowVariationItemDto)
  variationItems?: FixerWorkflowVariationItemDto[];

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
