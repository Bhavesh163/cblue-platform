import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsBoolean,
  IsDateString,
  IsNumber,
} from 'class-validator';

export class CreateOrderDto {
  @IsString()
  @IsNotEmpty()
  addressId: string;

  @IsString()
  @IsNotEmpty()
  serviceCategory: string;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsOptional()
  @IsBoolean()
  isUrgent?: boolean;

  @IsOptional()
  @IsDateString()
  scheduledAt?: string;

  @IsOptional()
  @IsNumber()
  estimatedPrice?: number;
}
