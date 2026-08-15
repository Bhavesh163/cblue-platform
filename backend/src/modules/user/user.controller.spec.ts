import { BadRequestException } from '@nestjs/common';
import { UserController } from './user.controller';
import { UserService } from './user.service';

describe('UserController account closure', () => {
  const userService = { closeAccount: jest.fn() };
  let controller: UserController;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new UserController(userService as unknown as UserService);
  });

  it('delegates password-confirmed closure to the service', async () => {
    userService.closeAccount.mockResolvedValue({ success: true });

    await expect(
      controller.closeAccount('user-1', { currentPassword: 'correct-password' }),
    ).resolves.toEqual({ success: true });

    expect(userService.closeAccount).toHaveBeenCalledWith(
      'user-1',
      'correct-password',
    );
  });

  it('limits closure attempts to three per minute', () => {
    expect(
      Reflect.getMetadata(
        'THROTTLER:LIMITdefault',
        UserController.prototype.closeAccount,
      ),
    ).toBe(3);
    expect(
      Reflect.getMetadata(
        'THROTTLER:TTLdefault',
        UserController.prototype.closeAccount,
      ),
    ).toBe(60000);
  });

  it('keeps the legacy unconfirmed delete route non-operational', () => {
    expect(() => controller.deleteAccount()).toThrow(BadRequestException);
    expect(userService.closeAccount).not.toHaveBeenCalled();
  });
});
