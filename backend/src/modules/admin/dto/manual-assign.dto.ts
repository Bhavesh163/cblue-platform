import { IsString, IsNotEmpty } from 'class-validator';

export class ManualAssignDto {
  @IsString()
  @IsNotEmpty()
  orderId: string;

  @IsString()
  @IsNotEmpty()
  fixerId: string;
}
