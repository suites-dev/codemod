import { TestBed } from '@automock/jest';
import { jest } from '@jest/globals';

describe('OrderService', () => {
  let service: OrderService;
  let repo: jest.Mocked<OrderRepository>;
  let payment: jest.Mocked<PaymentGateway>;

  beforeAll(() => {
    const { unit, unitRef } = TestBed.create(OrderService)
      .mock(OrderRepository)
      .using({
        findById: jest.fn(),
        save: jest.fn().mockResolvedValue(true)
      })
      .mock(PaymentGateway)
      .using({
        charge: jest.fn().mockResolvedValue({ success: true })
      })
      .compile();

    service = unit;
    repo = unitRef.get(OrderRepository);
    payment = unitRef.get(PaymentGateway);
  });

  it('should create order', async () => {
    repo.findById.mockResolvedValue({ id: '1', total: 100 });

    const result = await service.createOrder('1');

    expect(repo.findById).toHaveBeenCalledWith('1');
    expect(payment.charge).toHaveBeenCalled();
    expect(result.success).toBe(true);
  });
});
