import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { PropertyService } from '../property/property.service';
import { PropertyInquiryService } from '../property-inquiry/property-inquiry.service';
import { BlueBridgeService } from './blue-bridge.service';
import { PropertyWorkflowBridgeService } from './property-workflow-bridge.service';

describe('Blue bridge provider wiring', () => {
  it('resolves the circular property workflow bridge providers', async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        BlueBridgeService,
        PropertyWorkflowBridgeService,
        { provide: PrismaService, useValue: {} },
        { provide: ConfigService, useValue: { get: jest.fn() } },
        { provide: PropertyService, useValue: {} },
        { provide: PropertyInquiryService, useValue: {} },
      ],
    }).compile();

    const blueBridge = moduleRef.get(BlueBridgeService);
    const propertyWorkflow = moduleRef.get(PropertyWorkflowBridgeService);

    expect(
      (blueBridge as unknown as { propertyWorkflow?: unknown }).propertyWorkflow,
    ).toBe(propertyWorkflow);
    expect(
      (propertyWorkflow as unknown as { bridge?: unknown }).bridge,
    ).toBe(blueBridge);

    await moduleRef.close();
  });
});
