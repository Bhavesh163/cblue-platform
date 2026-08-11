import { plainToInstance } from 'class-transformer';
import 'reflect-metadata';
import { validate } from 'class-validator';
import { CreateOrderDto, OrderType } from './create-order.dto';

describe('CreateOrderDto budget breakdown contract', () => {
  const buildDto = (lineCount: number): CreateOrderDto =>
    plainToInstance(CreateOrderDto, {
      orderType: OrderType.PROJECT,
      serviceCategory: 'PROJECT',
      description: 'Persisted multi-service request',
      budgetBreakdown: Array.from({ length: lineCount }, (_, index) => ({
        service: `Service ${index + 1}`,
        serviceKey: `service-${index + 1}`,
        qty: 1,
        unit: 'job',
        unitKey: 'job',
        unitRate: 100,
        total: 100,
      })),
    });

  it('accepts up to 30 authoritative budget lines', async () => {
    await expect(validate(buildDto(30))).resolves.toEqual([]);
  });

  it('rejects more than 30 authoritative budget lines', async () => {
    const errors = await validate(buildDto(31));

    expect(
      errors.find((error) => error.property === 'budgetBreakdown')?.constraints,
    ).toHaveProperty('arrayMaxSize');
  });
});
