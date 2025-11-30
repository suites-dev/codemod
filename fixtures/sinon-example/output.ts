import { TestBed, type Mocked } from '@suites/unit';

describe('PaymentService', () => {
  let service: PaymentService;
  let gateway: Mocked<PaymentGateway>;
  let logger: Mocked<Logger>;

  beforeAll(async () => {
    const { unit, unitRef } = await TestBed.solitary(PaymentService)
      .mock(PaymentGateway)
      .impl({
        charge: stubFn(),
        refund: stubFn()
      })
      .mock(Logger)
      .impl({
        info: stubFn(),
        error: stubFn()
      })
      .compile();

    service = unit;
    gateway = unitRef.get(PaymentGateway);
    logger = unitRef.get(Logger);
  });

  it('should process payment', () => {
    gateway.charge.returns(Promise.resolve({ success: true }));

    const result = service.processPayment(100);

    expect(gateway.charge).to.have.been.calledOnce;
    expect(logger.info).to.have.been.called;
  });
});
