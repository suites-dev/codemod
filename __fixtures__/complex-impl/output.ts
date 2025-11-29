import { TestBed, type Mocked } from '@suites/unit';

describe('OrderService', () => {
  let service: OrderService;
  let repo: Mocked<OrderRepository>;
  let payment: Mocked<PaymentGateway>;

  beforeAll(async () => {
    const { unit, unitRef } = await TestBed.solitary(OrderService)
      .mock(OrderRepository)
      .impl(stubFn => ({
        findById: stubFn(),
        save: stubFn().mockResolvedValue(true)
      }))
      .mock(PaymentGateway)
      .impl(stubFn => ({
        charge: stubFn().mockResolvedValue({ success: true })
      }))
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
