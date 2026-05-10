import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsBoolean,
  IsDateString,
  IsNumber,
  IsIn,
  IsEnum,
} from 'class-validator';
import { ALL_SERVICE_CATEGORIES } from '../../../common/constants';

export enum OrderType {
  HOUSEHOLD = 'HOUSEHOLD',
  PROJECT = 'PROJECT',
}

export class CreateOrderDto {
  @IsString()
  @IsOptional()
  addressId?: string;

  @IsString()
  @IsOptional()
  fixerId?: string;

  @IsEnum(OrderType)
  orderType: OrderType = OrderType.HOUSEHOLD;

  @IsString()
  @IsNotEmpty()
  // @IsIn(ALL_SERVICE_CATEGORIES as unknown as string[])
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
