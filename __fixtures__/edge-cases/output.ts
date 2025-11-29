import { TestBed } from '@suites/unit';

describe('Edge Cases', () => {
  // Already async function - no duplicate async/await
  beforeAll(async () => {
    const { unit } = await TestBed.solitary(ServiceA).compile();
  });

  // No mocks at all
  it('should work without mocks', async () => {
    const { unit } = await TestBed.solitary(ServiceB).compile();
    expect(unit).toBeDefined();
  });

  // Generic type parameters
  it('should handle generics', async () => {
    const { unit } = await TestBed.solitary<MyService<string>>(MyService).compile();
  });

  // Nested destructuring
  it('should handle nested destructuring', async () => {
    const {
      unit: myUnit,
      unitRef: myRef
    } = await TestBed.solitary(ServiceC)
      .mock('TOKEN')
      .final('value')
      .compile();
  });

  // Arrow function with expression body
  it('test', async () => await TestBed.solitary(ServiceD).compile());

  // Multiple statements in hook
  beforeEach(async () => {
    console.log('setup');
    const { unit } = await TestBed.solitary(ServiceE).compile();
    console.log('done');
  });
});
