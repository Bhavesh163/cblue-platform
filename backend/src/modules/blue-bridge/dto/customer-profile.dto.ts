import { IsNotEmpty, IsString, Matches } from 'class-validator';

export class BlueCustomerProfileQueryDto {
  @IsString()
  @IsNotEmpty()
  legacySubjectId: string;
}

export class UpdateBlueCustomerPhoneDto extends BlueCustomerProfileQueryDto {
  @IsString()
  @Matches(/^[0-9\s\-+()]{9,15}$/)
  phone: string;
}
