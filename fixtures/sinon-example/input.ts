import { TestBed } from '@automock/sinon';

describe('PaymentService', () => {
  let service: PaymentService;
  let gateway: SinonStubbedInstance<PaymentGateway>;
  let logger: SinonStubbedInstance<Logger>;

  beforeAll(() => {
    const { unit, unitRef } = TestBed.create(PaymentService)
      .mock(PaymentGateway)
      .using({
        charge: sinon.stub(),
        refund: sinon.stub()
      })
      .mock(Logger)
      .using({
        info: sinon.stub(),
        error: sinon.stub()
      })
      .compile();

    service = unit;
    gateway = unitRef.get(PaymentGateway) as SinonStubbedInstance<PaymentGateway>;
    logger = unitRef.get(Logger) as SinonStubbedInstance<Logger>;
  });

  it('should process payment', () => {
    gateway.charge.returns(Promise.resolve({ success: true }));

    const result = service.processPayment(100);

    expect(gateway.charge).to.have.been.calledOnce;
    expect(logger.info).to.have.been.called;
  });
});
