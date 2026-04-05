import { IsString, IsOptional, IsInt, Min, Max } from 'class-validator';

export class RegisterFixerDto {
  @IsOptional()
  @IsString()
  bio?: string;

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
}
