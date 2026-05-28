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
  PropertyInquiryChatMessageDto,
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

  @Get('by-po/:poNumber/chat')
  listChatByPo(
    @Param('poNumber') poNumber: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.propertyInquiryService.listChatByPo(userId, poNumber);
  }

  @Post('by-po/:poNumber/chat')
  sendChatByPo(
    @Param('poNumber') poNumber: string,
    @CurrentUser('id') userId: string,
    @Body() dto: PropertyInquiryChatMessageDto,
  ) {
    return this.propertyInquiryService.sendChatByPo(userId, poNumber, dto.text);
  }

  @Put('by-po/:poNumber')
  updateByPo(
    @Param('poNumber') poNumber: string,
    @CurrentUser('id') userId: string,
    @Body() dto: UpdatePropertyInquiryDto,
  ) {
    return this.propertyInquiryService.updateByPo(poNumber, userId, dto);
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
