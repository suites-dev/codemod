import { TestBed, type Mocked } from '@suites/unit';

let service: MyService,
    mockRepo: Mocked<Repository>,
    mockLogger: Mocked<Logger>;

describe('MyService', () => {
  beforeEach(async () => {
    const { unit, unitRef } = await TestBed.solitary(MyService).compile();
    service = unit;
    mockRepo = unitRef.get(Repository);
    mockLogger = unitRef.get(Logger);
  });

  it('should process items', async () => {
    const items = [
      { id: 1, name: 'Item 1' },
      { id: 2, name: 'Item 2' },
    ] as Partial<Item>[];

    mockRepo.findAll.mockResolvedValue(items as Item[]);

    await expect(service.process()).resolves.toStrictEqual<Result>({
      success: true,
      count: expect.any(Number),
    });
  });

  it('should handle type casts', () => {
    const overrideFields: Partial<Charge>[] = [
      {
        currency: 'USD',
        chargeStatus: ChargeStatus.PENDING,
      },
      {
        currency: 'EUR',
        chargeStatus: ChargeStatus.COMPLETED,
      },
    ];

    const charges = [
      { id: 1 },
      { id: 2 },
    ] as Partial<Charge>[];

    mockRepo.getCharges.mockResolvedValueOnce(charges as Charge[]);
  });
});
