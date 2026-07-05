import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsBoolean,
  IsDateString,
  IsNumber,
  IsEnum,
  IsArray,
  ArrayMaxSize,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { UploadOrderAttachmentDto } from './upload-order-attachment.dto';

export class OrderBudgetBreakdownItemDto {
  @IsString()
  @IsNotEmpty()
  service!: string;

  @IsNumber()
  @Min(0)
  qty!: number;

  @IsString()
  @IsNotEmpty()
  unit!: string;

  @IsNumber()
  @Min(0)
  unitRate!: number;

  @IsNumber()
  @Min(0)
  total!: number;
}
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

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => OrderBudgetBreakdownItemDto)
  budgetBreakdown?: OrderBudgetBreakdownItemDto[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(5)
  @ValidateNested({ each: true })
  @Type(() => UploadOrderAttachmentDto)
  attachments?: UploadOrderAttachmentDto[];
}
