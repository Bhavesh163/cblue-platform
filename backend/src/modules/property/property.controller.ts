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
  Logger,
} from '@nestjs/common';
import { PropertyService } from './property.service';
import { CreatePropertyDto } from './dto/create-property.dto';
import { SearchPropertyDto } from './dto/search-property.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('properties')
export class PropertyController {
  private readonly logger = new Logger(PropertyController.name);

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
  async search(@Query() dto: SearchPropertyDto) {
    try {
      return await this.propertyService.search(dto);
    } catch (error) {
      this.logger.error(
        `Property search failed; returning empty result: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      const page = Number(dto.page) > 0 ? Number(dto.page) : 1;
      const limit = Number(dto.limit) > 0 ? Number(dto.limit) : 20;
      return { properties: [], total: 0, page, limit, totalPages: 0 };
    }
  }

  @Get('my')
  @UseGuards(JwtAuthGuard)
  async findMyProperties(@CurrentUser('id') userId: string) {
    try {
      return await this.propertyService.findByUser(String(userId || '').trim());
    } catch {
      return [];
    }
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
