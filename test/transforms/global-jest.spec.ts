import { testTransform } from '../utils/transform-test-helper';

describe('Global Jest Handling', () => {
  describe('When jest is global (no import)', () => {
    it('should transform jest.Mocked<T> even when jest is not imported', () => {
      const source = `
        import { TestBed } from '@automock/jest';

        describe('UserService', () => {
          let service: UserService;
          let repo: jest.Mocked<UserRepository>;
          let cache: jest.Mocked<CacheService>;

          beforeAll(() => {
            const { unit, unitRef } = TestBed.create(UserService)
              .mock(UserRepository)
              .using({ find: jest.fn() })
              .compile();

            service = unit;
            repo = unitRef.get(UserRepository);
          });
        });
      `;

      const result = testTransform(source);
      const transformed = result.code;

      // Should transform jest.Mocked to Mocked
      expect(transformed).toContain('Mocked<UserRepository>');
      expect(transformed).toContain('Mocked<CacheService>');
      expect(transformed).not.toMatch(/jest\.Mocked/);

      // Should add Mocked import
      expect(transformed).toMatch(/import.*Mocked.*@suites\/unit/);

      // Should transform TestBed
      expect(transformed).toContain('TestBed.solitary');
      expect(transformed).not.toContain('TestBed.create');

      // Should add await
      expect(transformed).toContain('await');
      expect(transformed).toMatch(/beforeAll\(async/);
    });

    it('should handle jest.fn() in mocks when jest is global', () => {
      const source = `
        import { TestBed } from '@automock/jest';

        beforeAll(() => {
          const { unit, unitRef } = TestBed.create(Service)
            .mock(Repository)
            .using({
              find: jest.fn(),
              save: jest.fn()
            })
            .compile();

          const repo = unitRef.get(Repository);
        });
      `;

      const result = testTransform(source);
      const transformed = result.code;

      // Should transform to .impl() (because retrieved)
      expect(transformed).toContain('.impl(');
      expect(transformed).not.toContain('.using(');

      // Should transform jest.fn() to stubFn()
      expect(transformed).toContain('stubFn()');
    });

    it('should work with partially migrated files (already using @suites/unit)', () => {
      const source = `
        import { TestBed } from '@suites/unit';

        describe('Service', () => {
          let mock: jest.Mocked<Dependency>;

          beforeAll(() => {
            const { unit } = TestBed.solitary(Service)
              .mock(Dependency)
              .using({ method: jest.fn() })
              .compile();
          });
        });
      `;

      const result = testTransform(source);
      const transformed = result.code;

      // Should still transform jest.Mocked even in partially migrated file
      expect(transformed).toContain('Mocked<Dependency>');
      expect(transformed).not.toMatch(/jest\.Mocked/);

      // Should add Mocked import if needed
      expect(transformed).toMatch(/import.*Mocked.*@suites\/unit/);
    });

    it('should handle files with no jest import but jest.Mocked usage', () => {
      const source = `
        import { TestBed } from '@automock/jest';

        let mockA: jest.Mocked<ServiceA>;
        let mockB: jest.Mocked<ServiceB>;
        let mockC: jest.Mocked<ServiceC>;

        TestBed.create(MyService).compile();
      `;

      const result = testTransform(source);
      const transformed = result.code;

      // All jest.Mocked should be transformed
      expect(transformed).toContain('Mocked<ServiceA>');
      expect(transformed).toContain('Mocked<ServiceB>');
      expect(transformed).toContain('Mocked<ServiceC>');
      expect(transformed).not.toMatch(/jest\.Mocked/);
    });
  });
});
