import { IsString, IsNotEmpty, IsOptional, IsInt, Min } from 'class-validator';

export class AddSkillDto {
  @IsString()
  @IsNotEmpty()
  category: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  yearsExperience?: number;
}
