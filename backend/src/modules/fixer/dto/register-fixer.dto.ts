import {
  IsString,
  IsOptional,
  IsInt,
  IsNumber,
  IsArray,
  Min,
  Max,
  Matches,
  ArrayMinSize,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

class SkillEntryDto {
  @IsString()
  category: string;

  @IsString()
  name: string;
}

class PriceRowDto {
  @IsString()
  service: string;

  @IsOptional()
  @IsString()
  quantity?: string;

  @IsOptional()
  @IsString()
  unit?: string;

  @IsString()
  @Matches(/^\d+(\.\d{1,2})?$/, {
    message: 'finalPrice must be a valid positive number',
  })
  finalPrice: string;
}

class AddressDto {
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
  @IsString()
  postalCode?: string;

  @IsOptional()
  @IsString()
  houseNumber?: string;

  @IsOptional()
  @IsString()
  building?: string;

  @IsOptional()
  @IsString()
  floor?: string;

  @IsOptional()
  @IsString()
  road?: string;

  @IsOptional()
  @IsString()
  soi?: string;
}

class GpsCoordsDto {
  @IsNumber()
  lat: number;

  @IsNumber()
  lng: number;
}

export class RegisterFixerDto {
  // ── Fields sent by frontend but belonging to subscriber (ignored by service) ──
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  email?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  company?: string;

  @IsOptional()
  @IsString()
  bio?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  pastExperience?: string;

  @IsOptional()
  @IsString()
  pastProjectType?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(50)
  yearsExperience?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  travelRadius?: number;

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1, { message: 'At least 1 skill is required' })
  @ValidateNested({ each: true })
  @Type(() => SkillEntryDto)
  skills?: SkillEntryDto[];

  @IsOptional()
  @ValidateNested()
  @Type(() => AddressDto)
  address?: AddressDto;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PriceRowDto)
  priceList?: PriceRowDto[];

  @IsOptional()
  @ValidateNested()
  @Type(() => GpsCoordsDto)
  gpsCoords?: GpsCoordsDto;

  @IsOptional()
  @IsString()
  scheduledDate?: string;

  // ── Extra fields sent by frontend (accepted but not stored in fixer table) ──
  @IsOptional()
  @ValidateNested()
  @Type(() => AddressDto)
  companyAddress?: AddressDto;

  @IsOptional()
  @IsString()
  recaptchaToken?: string;

  @IsOptional()
  @IsInt()
  kycImageCount?: number;

  @IsOptional()
  @IsInt()
  portfolioImageCount?: number;

  @IsOptional()
  @IsString()
  addressText?: string;

  @IsOptional()
  @IsNumber()
  aiScore?: number;

  @IsOptional()
  @IsString()
  aiTier?: string;

  @IsOptional()
  aiBreakdown?: any;

  @IsOptional()
  aiFlags?: any;

  @IsOptional()
  @IsString()
  aiCredentialStatus?: string;
}
