import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { PropertyWorkflowBridgeController } from './property-workflow-bridge.controller';
import { PropertyWorkflowBridgeService } from './property-workflow-bridge.service';

describe('PropertyWorkflowBridgeController', () => {
  const workflow = {
    createInquiry: jest.fn(),
    createBridgeInquiry: jest.fn(),
  };
  let controller: PropertyWorkflowBridgeController;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new PropertyWorkflowBridgeController(
      workflow as unknown as PropertyWorkflowBridgeService,
    );
  });

  it('rejects an unauthenticated inquiry without trusting request identity', () => {
    expect(() =>
      controller.createInquiry(undefined, undefined, undefined, {
        listingId: 'property-1',
      }),
    ).toThrow(UnauthorizedException);
    expect(workflow.createInquiry).not.toHaveBeenCalled();
    expect(workflow.createBridgeInquiry).not.toHaveBeenCalled();
  });

  it('requires an authenticated account or linked subject for bridge traffic', () => {
    expect(() =>
      controller.createInquiry('bridge-key', undefined, undefined, {
        listingId: 'property-1',
      }),
    ).toThrow(BadRequestException);
    expect(workflow.createBridgeInquiry).not.toHaveBeenCalled();
  });

  it('uses only the authenticated server-owned user id for direct inquiries', () => {
    workflow.createInquiry.mockReturnValue({ reference: 'PRE-1' });

    controller.createInquiry(undefined, undefined, 'partner-user-1', {
      listingId: 'property-1',
    });

    expect(workflow.createInquiry).toHaveBeenCalledWith('partner-user-1', {
      listingId: 'property-1',
    });
  });
});
