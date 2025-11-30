import { TestBed } from '@automock/jest';

describe('TypeAssertionTests', () => {
  let service: PaymentService;
  let mockRepo: jest.Mocked<PaymentRepository>;

  beforeEach(() => {
    const { unit, unitRef } = TestBed.create(PaymentService).compile();
    service = unit;
    mockRepo = unitRef.get(PaymentRepository);
  });

  it('should handle type assertions in resolves', async () => {
    await expect(service.process()).resolves.toStrictEqual<ReceiptViewModel>({
      ...mockInvoiceViewModel(),
      buyerEmail: expect.any(String),
    });
  });

  it('should handle complex nested generics', async () => {
    const result = await service.getEntries();
    expect(result).toStrictEqual<JournalEntry[]>([
      { id: 1, type: 'debit' },
      { id: 2, type: 'credit' },
    ]);
  });
});