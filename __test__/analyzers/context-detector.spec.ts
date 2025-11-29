import {
  detectSuitesContext,
  needsMockedImport,
  needsUnitReferenceImport,
  analyzeContext,
} from '../../src/analyzers/context-detector';

describe('Context Detector', () => {
  describe('detectSuitesContext', () => {
    it('should detect Automock/jest import', () => {
      const source = `import { TestBed } from '@automock/jest';`;
      expect(detectSuitesContext(source)).toBe(true);
    });

    it('should detect Automock/sinon import', () => {
      const source = `import { TestBed } from '@automock/sinon';`;
      expect(detectSuitesContext(source)).toBe(true);
    });

    it('should detect Automock/core import', () => {
      const source = `import { UnitReference } from '@automock/core';`;
      expect(detectSuitesContext(source)).toBe(true);
    });

    it('should detect Suites import with TestBed usage', () => {
      const source = `
        import { TestBed } from '@suites/unit';
        const { unit } = TestBed.solitary(Service).compile();
      `;
      expect(detectSuitesContext(source)).toBe(true);
    });

    it('should detect TestBed.create usage', () => {
      const source = `
        import { TestBed } from '@automock/jest';
        const { unit } = TestBed.create(Service).compile();
      `;
      expect(detectSuitesContext(source)).toBe(true);
    });

    it('should not detect context in non-Suites files', () => {
      const source = `
        import { jest } from '@jest/globals';
        const mockFn = jest.fn();
      `;
      expect(detectSuitesContext(source)).toBe(false);
    });

    it('should not detect context with only Suites import but no TestBed', () => {
      const source = `import { Mocked } from '@suites/unit';`;
      expect(detectSuitesContext(source)).toBe(false);
    });
  });

  describe('needsMockedImport', () => {
    it('should return true when jest.Mocked is used with unitRef.get()', () => {
      const source = `
        let repo: jest.Mocked<Repository>;
        repo = unitRef.get(Repository);
      `;
      expect(needsMockedImport(source)).toBe(true);
    });

    it('should return true when SinonStubbedInstance is used with unitRef.get()', () => {
      const source = `
        let service: SinonStubbedInstance<Service>;
        service = unitRef.get(Service);
      `;
      expect(needsMockedImport(source)).toBe(true);
    });

    it('should return false when jest.Mocked is used without unitRef.get()', () => {
      const source = `
        let repo: jest.Mocked<Repository>;
        repo = createMock<Repository>();
      `;
      expect(needsMockedImport(source)).toBe(false);
    });

    it('should return false when unitRef.get() is used without type annotations', () => {
      const source = `
        const repo = unitRef.get(Repository);
      `;
      expect(needsMockedImport(source)).toBe(false);
    });

    it('should return false in non-Suites context', () => {
      const source = `
        import { jest } from '@jest/globals';
        const mock: jest.Mocked<Service> = jest.fn();
      `;
      expect(needsMockedImport(source)).toBe(false);
    });
  });

  describe('needsUnitReferenceImport', () => {
    it('should return true when UnitReference is imported from @automock/core', () => {
      const source = `import { UnitReference } from '@automock/core';`;
      expect(needsUnitReferenceImport(source)).toBe(true);
    });

    it('should return true when UnitReference is used in type annotation', () => {
      const source = `
        import { UnitReference } from '@automock/core';
        let unitRef: UnitReference;
      `;
      expect(needsUnitReferenceImport(source)).toBe(true);
    });

    it('should return false when UnitReference is not imported', () => {
      const source = `import { TestBed } from '@automock/jest';`;
      expect(needsUnitReferenceImport(source)).toBe(false);
    });

    it('should return false when only @suites/unit is imported', () => {
      const source = `import { TestBed, UnitReference } from '@suites/unit';`;
      expect(needsUnitReferenceImport(source)).toBe(false);
    });
  });

  describe('analyzeContext', () => {
    it('should analyze complete Automock file context', () => {
      const source = `
        import { TestBed } from '@automock/jest';
        import { UnitReference } from '@automock/core';

        describe('Service', () => {
          let service: Service;
          let unitRef: UnitReference;
          let repo: jest.Mocked<Repository>;

          beforeAll(() => {
            const { unit, unitRef: ref } = TestBed.create(Service).compile();
            service = unit;
            unitRef = ref;
            repo = unitRef.get(Repository);
          });
        });
      `;

      const context = analyzeContext(source);

      expect(context).toEqual({
        isSuitesContext: true,
        needsMockedImport: true,
        needsUnitReferenceImport: true,
      });
    });

    it('should analyze simple Automock file without type imports', () => {
      const source = `
        import { TestBed } from '@automock/jest';

        describe('Service', () => {
          let service: Service;

          beforeAll(() => {
            const { unit } = TestBed.create(Service).compile();
            service = unit;
          });
        });
      `;

      const context = analyzeContext(source);

      expect(context).toEqual({
        isSuitesContext: true,
        needsMockedImport: false,
        needsUnitReferenceImport: false,
      });
    });

    it('should analyze non-Suites test file', () => {
      const source = `
        import { jest } from '@jest/globals';

        describe('Service', () => {
          it('should work', () => {
            const mock = jest.fn();
            expect(mock).toBeDefined();
          });
        });
      `;

      const context = analyzeContext(source);

      expect(context).toEqual({
        isSuitesContext: false,
        needsMockedImport: false,
        needsUnitReferenceImport: false,
      });
    });
  });
});
