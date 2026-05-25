import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { PropertyInquiryService } from './property-inquiry.service';
import {
  CreatePropertyInquiryDto,
  UpdatePropertyInquiryDto,
} from './dto/property-inquiry.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('property-inquiries')
@UseGuards(JwtAuthGuard)
export class PropertyInquiryController {
  constructor(
    private readonly propertyInquiryService: PropertyInquiryService,
  ) {}

  @Post()
  create(
    @CurrentUser('id') userId: string,
    @Body() dto: CreatePropertyInquiryDto,
  ) {
    return this.propertyInquiryService.create(userId, dto);
  }

  @Get('customer')
  findByCustomer(@CurrentUser('id') userId: string) {
    return this.propertyInquiryService.findByCustomer(userId);
  }

  @Get('lister')
  findByLister(@CurrentUser('id') userId: string) {
    return this.propertyInquiryService.findByLister(userId);
  }

  @Put(':id')
  update(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Body() dto: UpdatePropertyInquiryDto,
  ) {
    return this.propertyInquiryService.update(id, userId, dto);
  }
}
