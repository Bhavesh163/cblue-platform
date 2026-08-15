import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { UserService } from './user.service';
import type { UserContactProfile } from './user.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { CreateAddressDto } from './dto/create-address.dto';
import { CloseAccountDto } from './dto/close-account.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get('me')
  getProfile(@CurrentUser('id') userId: string) {
    return this.userService.getProfile(userId);
  }

  @Get('me/contact-profile')
  getContactProfile(
    @CurrentUser('id') userId: string,
  ): Promise<UserContactProfile> {
    return this.userService.getContactProfile(userId);
  }

  @Put('me')
  updateProfile(@CurrentUser('id') userId: string, @Body() dto: UpdateUserDto) {
    return this.userService.updateProfile(userId, dto);
  }

  @Put('me/phone')
  updatePhone(@CurrentUser('id') userId: string, @Body() dto: UpdateUserDto) {
    return this.userService.updateProfile(userId, dto);
  }

  // ── Addresses ──

  @Get('me/addresses')
  getAddresses(@CurrentUser('id') userId: string) {
    return this.userService.getAddresses(userId);
  }

  @Post('me/addresses')
  createAddress(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateAddressDto,
  ) {
    return this.userService.createAddress(userId, dto);
  }

  @Put('me/addresses/:addressId')
  updateAddress(
    @CurrentUser('id') userId: string,
    @Param('addressId') addressId: string,
    @Body() dto: CreateAddressDto,
  ) {
    return this.userService.updateAddress(userId, addressId, dto);
  }

  @Delete('me/addresses/:addressId')
  deleteAddress(
    @CurrentUser('id') userId: string,
    @Param('addressId') addressId: string,
  ) {
    return this.userService.deleteAddress(userId, addressId);
  }

  @Post('me/account-closure')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { ttl: 60000, limit: 3 } })
  closeAccount(
    @CurrentUser('id') userId: string,
    @Body() dto: CloseAccountDto,
  ) {
    return this.userService.closeAccount(userId, dto.currentPassword);
  }

  @Delete('me')
  deleteAccount() {
    throw new BadRequestException(
      'Password confirmation is required to close this account',
    );
  }
}
