import { Type } from 'class-transformer';
import { ListingType, PropertyType } from '@prisma/client';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

export class PropertyWorkflowListingQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @IsOptional()
  @IsEnum(PropertyType)
  propertyType?: PropertyType;

  @IsOptional()
  @IsEnum(ListingType)
  listingType?: ListingType;

  @IsOptional()
  @IsString()
  province?: string;

  @IsOptional()
  @IsString()
  district?: string;

  @IsOptional()
  @IsString()
  subdistrict?: string;

  @IsOptional()
  @Type(() => Number)
  @Min(0)
  minPrice?: number;

  @IsOptional()
  @Type(() => Number)
  @Min(0)
  maxPrice?: number;

  @IsOptional()
  @IsString()
  keyword?: string;
}

export class PropertyWorkflowAttachmentDto {
  @IsString()
  @IsNotEmpty()
  url!: string;

  @IsString()
  @IsNotEmpty()
  key!: string;

  @IsOptional()
  @IsString()
  label?: string;
}

export class CreatePropertyWorkflowInquiryDto {
  @IsString()
  @IsNotEmpty()
  listingId!: string;

  @IsOptional()
  @IsString()
  requestDetails?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @ValidateNested({ each: true })
  @Type(() => PropertyWorkflowAttachmentDto)
  attachments?: PropertyWorkflowAttachmentDto[];
}

export class PropertyWorkflowActionDto {
  @IsOptional()
  @IsString()
  note?: string;

  @IsOptional()
  @IsBoolean()
  freePass?: boolean;

  @IsOptional()
  @IsString()
  meetingDate?: string;

  @IsOptional()
  @IsString()
  meetingTime?: string;

  @IsOptional()
  @IsString()
  meetingVenue?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5)
  rating?: number;
}
