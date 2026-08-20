import { FixerController } from './fixer.controller';
import { FixerService } from './fixer.service';

describe('FixerController', () => {
  it('does not require customer authentication for an absent fixer profile', () => {
    const service = {
      getMyFixerProfile: jest.fn(),
    } as unknown as FixerService;
    const controller = new FixerController(service);

    expect(controller.getMyProfile()).toBeNull();
    expect(service.getMyFixerProfile).not.toHaveBeenCalled();
  });

  it('still loads the profile for an authenticated fixer', async () => {
    const profile = { userId: 'fixer-1' };
    const service = {
      getMyFixerProfile: jest.fn().mockResolvedValue(profile),
    } as unknown as FixerService;
    const controller = new FixerController(service);

    await expect(controller.getMyProfile('fixer-1')).resolves.toBe(profile);
  });
});
