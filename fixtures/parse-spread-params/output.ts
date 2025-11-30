import { TestBed } from '@suites/unit';

describe('SpreadParamTests', () => {
  const payoutsFactory = (
    merchantId: number,
    ...payouts: Partial<Payout>[]
  ): { databasePayouts: Payout[]; externalStripePayments: ExternalGatewayPayment[] } => {
    return {
      databasePayouts: payouts as Payout[],
      externalStripePayments: []
    };
  };

  const itemFactory = (id: string, ...items: Item[]): Result => ({ id, items });

  it('should handle spread syntax', () => {
    const result = payoutsFactory(123, { amount: 100 }, { amount: 200 });
    expect(result).toBeDefined();
  });
});
