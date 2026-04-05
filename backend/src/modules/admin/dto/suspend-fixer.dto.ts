import { IsString, IsNotEmpty, MinLength } from 'class-validator';

export class SuspendFixerDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(10)
  reason: string;
}
