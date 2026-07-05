import { ArrayMaxSize, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { OrderBudgetBreakdownItemDto } from './create-order.dto';

export class UpdateOrderBudgetBreakdownDto {
  @IsArray()
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => OrderBudgetBreakdownItemDto)
  budgetBreakdown!: OrderBudgetBreakdownItemDto[];
}
