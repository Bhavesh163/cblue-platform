import { Module } from '@nestjs/common';
import { PropertyInquiryController } from './property-inquiry.controller';
import { PropertyInquiryService } from './property-inquiry.service';

@Module({
  controllers: [PropertyInquiryController],
  providers: [PropertyInquiryService],
  exports: [PropertyInquiryService],
})
export class PropertyInquiryModule {}
