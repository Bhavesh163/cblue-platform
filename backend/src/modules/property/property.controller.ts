import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  NotFoundException,
} from '@nestjs/common';
import { PropertyService } from './property.service';
import { CreatePropertyDto } from './dto/create-property.dto';
import { SearchPropertyDto } from './dto/search-property.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('properties')
export class PropertyController {
  constructor(private readonly propertyService: PropertyService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  create(
    @CurrentUser()
    currentUser: { id?: string; email?: string; phone?: string } | undefined,
    @Body() dto: CreatePropertyDto,
  ) {
    return this.propertyService.create(currentUser, dto);
  }

  @Get()
  search(@Query() dto: SearchPropertyDto) {
    return this.propertyService.search(dto);
  }

  @Get('my')
  @UseGuards(JwtAuthGuard)
  findMyProperties(@CurrentUser('id') userId: string) {
    return this.propertyService.findByUser(userId);
  }

  @Get(':id')
  async findById(@Param('id') id: string) {
    const property = await this.propertyService.findById(id);
    if (!property) {
      throw new NotFoundException('Property not found');
    }
    return property;
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  async update(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Body() dto: Partial<CreatePropertyDto>,
  ) {
    const property = await this.propertyService.update(id, userId, dto);
    if (!property) {
      throw new NotFoundException('Property not found');
    }
    return property;
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  async remove(@Param('id') id: string, @CurrentUser('id') userId: string) {
    const property = await this.propertyService.remove(id, userId);
    if (!property) {
      throw new NotFoundException('Property not found');
    }
    return { message: 'Property removed' };
  }
}
