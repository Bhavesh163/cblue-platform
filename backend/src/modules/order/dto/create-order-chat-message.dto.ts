import { IsString, IsNotEmpty, MaxLength } from 'class-validator';

export class CreateOrderChatMessageDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(5000)
  text: string;
}
