import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { PropertyInquiryStatus } from '@prisma/client';

export class CreatePropertyInquiryDto {
  @IsString()
  poNumber: string;

  @IsString()
  propertyId: string;

  @IsString()
  listerUserId: string;

  @IsString()
  customerName: string;

  @IsString()
  customerEmail: string;

  @IsString()
  listerName: string;
}

export class UpdatePropertyInquiryDto {
  @IsOptional()
  @IsEnum(PropertyInquiryStatus)
  status?: PropertyInquiryStatus;

  @IsOptional()
  @IsInt()
  step?: number;

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
  @IsInt()
  @Min(1)
  @Max(5)
  customerRating?: number;

  @IsOptional()
  @IsString()
  customerComment?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  listerRating?: number;

  @IsOptional()
  @IsString()
  listerComment?: string;

  @IsOptional()
  reselectedOnce?: boolean;
}
