import jscodeshift from 'jscodeshift';
import { cleanupObsoleteTypeCasts } from '../../src/transforms/cleanup-transformer';

const j = jscodeshift.withParser('tsx');

describe('Cleanup Transformer', () => {
  describe('Rule D: Remove obsolete type casts', () => {
    describe('Remove jest.Mocked<T> casts', () => {
      it('should remove "as jest.Mocked<T>" type cast', () => {
        const source = `
          const repo = unitRef.get(Repository) as jest.Mocked<Repository>;
        `;
        const root = j(source);

        cleanupObsoleteTypeCasts(j, root);

        const output = root.toSource();
        expect(output).not.toMatch(/as\s+jest\.Mocked/);
        expect(output).toContain('unitRef.get(Repository)');
      });

      it('should remove multiple jest.Mocked casts', () => {
        const source = `
          const repo = unitRef.get(Repository) as jest.Mocked<Repository>;
          const service = unitRef.get(Service) as jest.Mocked<Service>;
          const logger = unitRef.get(Logger) as jest.Mocked<Logger>;
        `;
        const root = j(source);

        cleanupObsoleteTypeCasts(j, root);

        const output = root.toSource();
        const castCount = (output.match(/as\s+jest\.Mocked/g) || []).length;
        expect(castCount).toBe(0);
        expect(output).toContain('unitRef.get(Repository)');
        expect(output).toContain('unitRef.get(Service)');
        expect(output).toContain('unitRef.get(Logger)');
      });

      it('should handle jest.Mocked casts in different contexts', () => {
        const source = `
          beforeAll(() => {
            const repo = unitRef.get(Repo) as jest.Mocked<Repo>;
          });

          it('test', () => {
            const service = unitRef.get(Service) as jest.Mocked<Service>;
          });
        `;
        const root = j(source);

        cleanupObsoleteTypeCasts(j, root);

        const output = root.toSource();
        expect(output).not.toMatch(/as\s+jest\.Mocked/);
      });

      it('should preserve the variable assignment', () => {
        const source = `
          const repository = unitRef.get(UserRepository) as jest.Mocked<UserRepository>;
        `;
        const root = j(source);

        cleanupObsoleteTypeCasts(j, root);

        const output = root.toSource();
        expect(output).toMatch(/const repository = unitRef\.get\(UserRepository\)/);
        expect(output).not.toContain('jest.Mocked');
      });
    });

    describe('Remove SinonStubbedInstance<T> casts', () => {
      it('should remove "as SinonStubbedInstance<T>" type cast', () => {
        const source = `
          const service = unitRef.get(Service) as SinonStubbedInstance<Service>;
        `;
        const root = j(source);

        cleanupObsoleteTypeCasts(j, root);

        const output = root.toSource();
        expect(output).not.toContain('SinonStubbedInstance');
        expect(output).toContain('unitRef.get(Service)');
      });

      it('should remove multiple SinonStubbedInstance casts', () => {
        const source = `
          const repo = unitRef.get(Repository) as SinonStubbedInstance<Repository>;
          const cache = unitRef.get(CacheService) as SinonStubbedInstance<CacheService>;
        `;
        const root = j(source);

        cleanupObsoleteTypeCasts(j, root);

        const output = root.toSource();
        const castCount = (output.match(/as\s+SinonStubbedInstance/g) || []).length;
        expect(castCount).toBe(0);
      });

      it('should handle SinonStubbedInstance casts in different contexts', () => {
        const source = `
          beforeEach(() => {
            const stub = unitRef.get(Dependency) as SinonStubbedInstance<Dependency>;
          });
        `;
        const root = j(source);

        cleanupObsoleteTypeCasts(j, root);

        const output = root.toSource();
        expect(output).not.toContain('SinonStubbedInstance');
        expect(output).toContain('unitRef.get(Dependency)');
      });
    });

    describe('Mixed type casts', () => {
      it('should remove both jest.Mocked and SinonStubbedInstance casts', () => {
        const source = `
          const jestMock = unitRef.get(JestService) as jest.Mocked<JestService>;
          const sinonMock = unitRef.get(SinonService) as SinonStubbedInstance<SinonService>;
        `;
        const root = j(source);

        cleanupObsoleteTypeCasts(j, root);

        const output = root.toSource();
        expect(output).not.toMatch(/as\s+jest\.Mocked/);
        expect(output).not.toContain('SinonStubbedInstance');
        expect(output).toContain('unitRef.get(JestService)');
        expect(output).toContain('unitRef.get(SinonService)');
      });
    });

    describe('Complete examples', () => {
      it('should clean up complete test setup with jest.Mocked casts', () => {
        const source = `
          describe('UserService', () => {
            let service: UserService;
            let userRepo: Mocked<UserRepository>;
            let emailService: Mocked<EmailService>;

            beforeAll(async () => {
              const { unit, unitRef } = await TestBed.solitary(UserService).compile();
              service = unit;
              userRepo = unitRef.get(UserRepository) as jest.Mocked<UserRepository>;
              emailService = unitRef.get(EmailService) as jest.Mocked<EmailService>;
            });

            it('should create user', () => {
              userRepo.save.mockResolvedValue({ id: 1 });
              expect(service.createUser()).toBeDefined();
            });
          });
        `;
        const root = j(source);

        cleanupObsoleteTypeCasts(j, root);

        const output = root.toSource();
        expect(output).not.toMatch(/as\s+jest\.Mocked/);
        expect(output).toContain('userRepo = unitRef.get(UserRepository)');
        expect(output).toContain('emailService = unitRef.get(EmailService)');
      });

      it('should clean up complete test setup with SinonStubbedInstance casts', () => {
        const source = `
          describe('Service', () => {
            let dependency: Mocked<Dependency>;

            beforeEach(async () => {
              const { unitRef } = await TestBed.solitary(Service).compile();
              dependency = unitRef.get(Dependency) as SinonStubbedInstance<Dependency>;
            });
          });
        `;
        const root = j(source);

        cleanupObsoleteTypeCasts(j, root);

        const output = root.toSource();
        expect(output).not.toContain('SinonStubbedInstance');
        expect(output).toContain('dependency = unitRef.get(Dependency)');
      });

      it('should NOT remove other type casts', () => {
        const source = `
          const value = someFunction() as string;
          const number = getValue() as number;
        `;
        const root = j(source);

        cleanupObsoleteTypeCasts(j, root);

        const output = root.toSource();
        // Should preserve non-mock type casts
        expect(output).toContain('as string');
        expect(output).toContain('as number');
      });

      it('should handle nested type casts', () => {
        const source = `
          const repo = (unitRef.get(Repository) as jest.Mocked<Repository>);
        `;
        const root = j(source);

        cleanupObsoleteTypeCasts(j, root);

        const output = root.toSource();
        expect(output).not.toMatch(/as\s+jest\.Mocked/);
        expect(output).toContain('unitRef.get(Repository)');
      });
    });
  });
});
