import jscodeshift from 'jscodeshift';
import { transformTestBed } from '../../src/transforms/testbed-transformer';

const j = jscodeshift.withParser('tsx');

describe('TestBed Transformer', () => {
  describe('Rule B1: Replace .create() with .solitary()', () => {
    it('should replace TestBed.create() with TestBed.solitary()', () => {
      const source = `
        const { unit } = TestBed.create(Service).compile();
      `;
      const root = j(source);

      transformTestBed(j, root);

      const output = root.toSource();
      expect(output).toMatch(/TestBed\.solitary/);
      expect(output).not.toContain('TestBed.create');
    });

    it('should handle TestBed.create() with generic type parameters', () => {
      const source = `
        const { unit, unitRef } = TestBed.create<Service>(Service).compile();
      `;
      const root = j(source);

      transformTestBed(j, root);

      const output = root.toSource();
      expect(output).toMatch(/TestBed\.solitary/);
      expect(output).not.toContain('TestBed.create');
    });

    it('should replace multiple TestBed.create() calls', () => {
      const source = `
        describe('Test', () => {
          beforeEach(() => {
            TestBed.create(ServiceA).compile();
          });

          it('test', () => {
            TestBed.create(ServiceB).compile();
          });
        });
      `;
      const root = j(source);

      transformTestBed(j, root);

      const output = root.toSource();
      const createCount = (output.match(/TestBed\.create/g) || []).length;
      const solitaryCount = (output.match(/TestBed\.solitary/g) || []).length;
      expect(createCount).toBe(0);
      expect(solitaryCount).toBe(2);
    });
  });

  describe('Rule B2: Add await to .compile() and make parent async', () => {
    it('should add await to .compile() call', () => {
      const source = `
        beforeAll(() => {
          const { unit } = TestBed.create(Service).compile();
        });
      `;
      const root = j(source);

      transformTestBed(j, root);

      const output = root.toSource();
      expect(output).toMatch(/await.*\.compile\(\)/);
    });

    it('should make parent function async', () => {
      const source = `
        beforeAll(() => {
          const { unit } = TestBed.create(Service).compile();
        });
      `;
      const root = j(source);

      transformTestBed(j, root);

      const output = root.toSource();
      expect(output).toMatch(/beforeAll\(async\s*\(\)/);
    });

    it('should NOT add await if already awaited', () => {
      const source = `
        beforeAll(async () => {
          const { unit } = await TestBed.create(Service).compile();
        });
      `;
      const root = j(source);

      transformTestBed(j, root);

      const output = root.toSource();
      // Should still have await but not duplicate
      const awaitCount = (output.match(/await/g) || []).length;
      expect(awaitCount).toBe(1);
    });

    it('should handle compile in beforeEach', () => {
      const source = `
        beforeEach(() => {
          const { unit } = TestBed.create(Service).compile();
        });
      `;
      const root = j(source);

      transformTestBed(j, root);

      const output = root.toSource();
      expect(output).toMatch(/beforeEach\(async\s*\(\)/);
      expect(output).toMatch(/await.*\.compile\(\)/);
    });

    it('should handle compile in test/it block', () => {
      const source = `
        it('should work', () => {
          const { unit } = TestBed.create(Service).compile();
        });
      `;
      const root = j(source);

      transformTestBed(j, root);

      const output = root.toSource();
      expect(output).toMatch(/it\([^,]+,\s*async\s*\(\)/);
      expect(output).toMatch(/await.*\.compile\(\)/);
    });

    it('should NOT transform non-TestBed .compile() calls', () => {
      const source = `
        const result = compiler.compile();
      `;
      const root = j(source);

      transformTestBed(j, root);

      const output = root.toSource();
      expect(output).not.toMatch(/await.*compiler\.compile/);
      expect(output).toContain('compiler.compile()');
    });

    it('should handle chained TestBed calls with .compile()', () => {
      const source = `
        beforeAll(() => {
          const { unit } = TestBed.create(Service)
            .mock(Repository)
            .using({ find: jest.fn() })
            .compile();
        });
      `;
      const root = j(source);

      transformTestBed(j, root);

      const output = root.toSource();
      expect(output).toContain('await');
      expect(output).toContain('.compile()');
      expect(output).toMatch(/beforeAll\(async\s*\(\)/);
    });
  });

  describe('Complete transformation', () => {
    it('should handle complete TestBed transformation with both rules', () => {
      const source = `
        describe('UserService', () => {
          let service: UserService;
          let userRepo: jest.Mocked<UserRepository>;

          beforeAll(() => {
            const { unit, unitRef } = TestBed.create(UserService).compile();
            service = unit;
            userRepo = unitRef.get(UserRepository);
          });

          it('should find user', () => {
            userRepo.find.mockResolvedValue({ id: 1 });
            const result = service.findUser(1);
            expect(result).toBeDefined();
          });
        });
      `;
      const root = j(source);

      transformTestBed(j, root);

      const output = root.toSource();

      // Should transform .create() to .solitary()
      expect(output).toMatch(/TestBed\.solitary/);
      expect(output).not.toContain('TestBed.create');

      // Should add await to .compile()
      expect(output).toMatch(/await.*\.compile\(\)/);

      // Should make beforeAll async
      expect(output).toMatch(/beforeAll\(async\s*\(\)/);
    });

    it('should handle multiple compile calls in different hooks', () => {
      const source = `
        describe('Test', () => {
          beforeAll(() => {
            TestBed.create(ServiceA).compile();
          });

          beforeEach(() => {
            TestBed.create(ServiceB).compile();
          });

          it('test', () => {
            TestBed.create(ServiceC).compile();
          });
        });
      `;
      const root = j(source);

      transformTestBed(j, root);

      const output = root.toSource();

      // All should be transformed to solitary
      expect(output).not.toContain('TestBed.create');
      const solitaryCount = (output.match(/TestBed\.solitary/g) || []).length;
      expect(solitaryCount).toBe(3);

      // All should be awaited
      const awaitCount = (output.match(/await/g) || []).length;
      expect(awaitCount).toBe(3);

      // All parent functions should be async
      expect(output).toMatch(/beforeAll\(async\s*\(\)/);
      expect(output).toMatch(/beforeEach\(async\s*\(\)/);
      expect(output).toMatch(/it\([^,]+,\s*async\s*\(\)/);
    });

    it('should preserve other TestBed method calls', () => {
      const source = `
        beforeAll(() => {
          const { unit } = TestBed.create(Service)
            .mock(Dependency)
            .using({ method: jest.fn() })
            .compile();
        });
      `;
      const root = j(source);

      transformTestBed(j, root);

      const output = root.toSource();

      // Should preserve .mock() and .using()
      expect(output).toContain('.mock(');
      expect(output).toContain('.using(');

      // But transform .create() and .compile()
      expect(output).toMatch(/TestBed\.solitary/);
      expect(output).toContain('await');
      expect(output).toContain('.compile()');
    });

    it('should handle arrow functions with explicit return', () => {
      const source = `
        beforeAll(() => {
          return TestBed.create(Service).compile();
        });
      `;
      const root = j(source);

      transformTestBed(j, root);

      const output = root.toSource();

      expect(output).toMatch(/beforeAll\(async\s*\(\)/);
      expect(output).toMatch(/await.*\.compile\(\)/);
      expect(output).toMatch(/TestBed\.solitary/);
    });
  });
});
