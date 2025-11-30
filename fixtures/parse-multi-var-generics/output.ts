import { TestBed, type Mocked } from '@suites/unit';

let service: InternalTransactionUpdateService,
    chargeService: Mocked<ChargeService>,
    transactionDao: Mocked<TransactionDao>,
    confirmTransaction: Mocked<ConfirmTransaction>,
    paymentEventLogService: Mocked<PaymentEventLogService>;

describe('Test', () => {
  beforeAll(async () => {
    const { unit, unitRef } = await TestBed.solitary(InternalTransactionUpdateService).compile();
    service = unit;
    chargeService = unitRef.get(ChargeService);
  });

  it('should work', () => {
    expect(service).toBeDefined();
  });
});