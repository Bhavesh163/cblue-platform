import { IsBoolean, IsString, MinLength } from 'class-validator';

export class QualificationReviewCheckDto {
  @IsBoolean()
  acceptProposal: boolean;

  @IsString()
  @MinLength(10)
  reason: string;
}
