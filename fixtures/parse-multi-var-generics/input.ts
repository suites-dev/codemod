import { TestBed } from '@automock/jest';

let service: InternalTransactionUpdateService,
    chargeService: jest.Mocked<ChargeService>,
    transactionDao: jest.Mocked<TransactionDao>,
    confirmTransaction: jest.Mocked<ConfirmTransaction>,
    paymentEventLogService: jest.Mocked<PaymentEventLogService>;

describe('Test', () => {
  beforeAll(() => {
    const { unit, unitRef } = TestBed.create(InternalTransactionUpdateService).compile();
    service = unit;
    chargeService = unitRef.get(ChargeService);
  });

  it('should work', () => {
    expect(service).toBeDefined();
  });
});
