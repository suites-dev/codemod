import { TestBed } from '@automock/jest';

describe('Edge Cases', () => {
  // Already async function
  beforeAll(async () => {
    const { unit } = await TestBed.create(ServiceA).compile();
  });

  // No mocks at all
  it('should work without mocks', () => {
    const { unit } = TestBed.create(ServiceB).compile();
    expect(unit).toBeDefined();
  });

  // Generic type parameters
  it('should handle generics', () => {
    const { unit } = TestBed.create<MyService<string>>(MyService).compile();
  });

  // Nested destructuring
  it('should handle nested destructuring', () => {
    const {
      unit: myUnit,
      unitRef: myRef
    } = TestBed.create(ServiceC)
      .mock('TOKEN')
      .using('value')
      .compile();
  });

  // Arrow function with expression body
  it('test', () => TestBed.create(ServiceD).compile());

  // Multiple statements in hook
  beforeEach(() => {
    console.log('setup');
    const { unit } = TestBed.create(ServiceE).compile();
    console.log('done');
  });
});
