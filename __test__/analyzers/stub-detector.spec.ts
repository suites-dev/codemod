import jscodeshift from 'jscodeshift';
import {
  detectStubUsageInMock,
  analyzeAllMockConfigurations,
  doesMockUseStubs,
  countStubsInSource,
} from '../../src/analyzers/stub-detector';

const j = jscodeshift.withParser('tsx');

describe('Stub Detector', () => {
  describe('detectStubUsageInMock', () => {
    it('should detect jest.fn() usage', () => {
      const source = `const obj = { method: jest.fn() };`;
      const root = j(source);
      const objectExpr = root.find(j.ObjectExpression).at(0);
      const node = objectExpr.paths()[0].value;

      expect(detectStubUsageInMock(j, node)).toBe(true);
    });

    it('should detect sinon.stub() usage', () => {
      const source = `const obj = { method: sinon.stub() };`;
      const root = j(source);
      const objectExpr = root.find(j.ObjectExpression).at(0);
      const node = objectExpr.paths()[0].value;

      expect(detectStubUsageInMock(j, node)).toBe(true);
    });

    it('should detect multiple jest.fn() calls', () => {
      const source = `const obj = {
        method1: jest.fn(),
        method2: jest.fn().mockReturnValue(42)
      };`;
      const root = j(source);
      const objectExpr = root.find(j.ObjectExpression).at(0);
      const node = objectExpr.paths()[0].value;

      expect(detectStubUsageInMock(j, node)).toBe(true);
    });

    it('should detect jest.fn() with mockReturnValue', () => {
      const source = `const obj = { method: jest.fn().mockReturnValue(true) };`;
      const root = j(source);
      const objectExpr = root.find(j.ObjectExpression).at(0);
      const node = objectExpr.paths()[0].value;

      expect(detectStubUsageInMock(j, node)).toBe(true);
    });

    it('should detect jest.fn() with mockResolvedValue', () => {
      const source = `const obj = { method: jest.fn().mockResolvedValue({ data: 'test' }) };`;
      const root = j(source);
      const objectExpr = root.find(j.ObjectExpression).at(0);
      const node = objectExpr.paths()[0].value;

      expect(detectStubUsageInMock(j, node)).toBe(true);
    });

    it('should not detect plain functions', () => {
      const source = `const obj = { method: () => 'value' };`;
      const root = j(source);
      const objectExpr = root.find(j.ObjectExpression).at(0);
      const node = objectExpr.paths()[0].value;

      expect(detectStubUsageInMock(j, node)).toBe(false);
    });

    it('should not detect plain values', () => {
      const source = `const obj = { value: 42, name: 'test' };`;
      const root = j(source);
      const objectExpr = root.find(j.ObjectExpression).at(0);
      const node = objectExpr.paths()[0].value;

      expect(detectStubUsageInMock(j, node)).toBe(false);
    });
  });

  describe('analyzeAllMockConfigurations', () => {
    it('should analyze single mock with stubs', () => {
      const source = `
        TestBed.create(Service)
          .mock(Repository)
          .using({
            find: jest.fn(),
            save: jest.fn()
          })
          .compile();
      `;
      const root = j(source);
      const configs = analyzeAllMockConfigurations(j, root);

      expect(configs.get('Repository')).toBe(true);
    });

    it('should analyze single mock without stubs', () => {
      const source = `
        TestBed.create(Service)
          .mock(Repository)
          .using({
            find: () => Promise.resolve({ id: 1 })
          })
          .compile();
      `;
      const root = j(source);
      const configs = analyzeAllMockConfigurations(j, root);

      expect(configs.get('Repository')).toBe(false);
    });

    it('should analyze multiple mocks with mixed stub usage', () => {
      const source = `
        TestBed.create(Service)
          .mock(Repository)
          .using({
            find: jest.fn(),
            save: jest.fn()
          })
          .mock(CacheService)
          .using({
            get: () => 'cached-value',
            set: () => {}
          })
          .mock(Logger)
          .using({
            log: jest.fn(),
            error: jest.fn()
          })
          .compile();
      `;
      const root = j(source);
      const configs = analyzeAllMockConfigurations(j, root);

      expect(configs.get('Repository')).toBe(true);
      expect(configs.get('CacheService')).toBe(false);
      expect(configs.get('Logger')).toBe(true);
    });

    it('should analyze token injection mocks', () => {
      const source = `
        TestBed.create(Service)
          .mock('API_KEY')
          .using('test-key-123')
          .mock('CONFIG')
          .using({ timeout: 5000 })
          .compile();
      `;
      const root = j(source);
      const configs = analyzeAllMockConfigurations(j, root);

      expect(configs.get('API_KEY')).toBe(false);
      expect(configs.get('CONFIG')).toBe(false);
    });

    it('should handle sinon stubs', () => {
      const source = `
        TestBed.create(Service)
          .mock(Repository)
          .using({
            find: sinon.stub().returns({ id: 1 }),
            save: sinon.stub()
          })
          .compile();
      `;
      const root = j(source);
      const configs = analyzeAllMockConfigurations(j, root);

      expect(configs.get('Repository')).toBe(true);
    });

    it('should handle empty mocks', () => {
      const source = `
        TestBed.create(Service).compile();
      `;
      const root = j(source);
      const configs = analyzeAllMockConfigurations(j, root);

      expect(configs.size).toBe(0);
    });
  });

  describe('doesMockUseStubs', () => {
    it('should return true when mock uses stubs', () => {
      const source = `
        TestBed.create(Service)
          .mock(Repository)
          .using({
            find: jest.fn()
          })
          .compile();
      `;
      const root = j(source);

      expect(doesMockUseStubs(j, root, 'Repository')).toBe(true);
    });

    it('should return false when mock does not use stubs', () => {
      const source = `
        TestBed.create(Service)
          .mock(Repository)
          .using({
            find: () => 'value'
          })
          .compile();
      `;
      const root = j(source);

      expect(doesMockUseStubs(j, root, 'Repository')).toBe(false);
    });

    it('should return false for non-existent mock', () => {
      const source = `
        TestBed.create(Service)
          .mock(Repository)
          .using({
            find: jest.fn()
          })
          .compile();
      `;
      const root = j(source);

      expect(doesMockUseStubs(j, root, 'NonExistent')).toBe(false);
    });
  });

  describe('countStubsInSource', () => {
    it('should count jest.fn() calls', () => {
      const source = `
        const mock1 = jest.fn();
        const mock2 = jest.fn();
        const mock3 = jest.fn().mockReturnValue(42);
      `;

      expect(countStubsInSource(j, source)).toBe(3); // 3 jest.fn() calls
    });

    it('should count sinon.stub() calls', () => {
      const source = `
        const stub1 = sinon.stub();
        const stub2 = sinon.stub().returns(42);
      `;

      expect(countStubsInSource(j, source)).toBe(2);
    });

    it('should count mixed jest and sinon calls', () => {
      const source = `
        const jestMock = jest.fn();
        const sinonStub = sinon.stub();
      `;

      expect(countStubsInSource(j, source)).toBe(2);
    });

    it('should return 0 for source without stubs', () => {
      const source = `
        const value = () => 42;
        const data = { key: 'value' };
      `;

      expect(countStubsInSource(j, source)).toBe(0);
    });

    it('should handle complex real-world example', () => {
      const source = `
        TestBed.create(OrderService)
          .mock(OrderRepository)
          .using({
            findById: jest.fn(),
            save: jest.fn().mockResolvedValue(true)
          })
          .mock(PaymentGateway)
          .using({
            charge: jest.fn().mockResolvedValue({ success: true })
          })
          .compile();
      `;

      // 3 jest.fn() calls
      expect(countStubsInSource(j, source)).toBe(3);
    });
  });
});
