import jscodeshift from 'jscodeshift';
import {
  detectRetrievals,
  isDependencyRetrieved,
  detectRetrievalsFromSource,
} from '../../src/analyzers/retrieval-detector';

const j = jscodeshift.withParser('tsx');

describe('Retrieval Detector', () => {
  describe('detectRetrievals', () => {
    it('should detect single dependency retrieval', () => {
      const source = `
        const { unitRef } = TestBed.create(Service).compile();
        const repo = unitRef.get(UserRepository);
      `;
      const root = j(source);
      const retrievals = detectRetrievals(j, root);

      expect(retrievals).toEqual(new Set(['UserRepository']));
    });

    it('should detect multiple dependency retrievals', () => {
      const source = `
        const { unitRef } = TestBed.create(Service).compile();
        const repo = unitRef.get(UserRepository);
        const cache = unitRef.get(CacheService);
        const logger = unitRef.get(Logger);
      `;
      const root = j(source);
      const retrievals = detectRetrievals(j, root);

      expect(retrievals).toEqual(
        new Set(['UserRepository', 'CacheService', 'Logger'])
      );
    });

    it('should detect string token retrievals', () => {
      const source = `
        const { unitRef } = TestBed.create(Service).compile();
        const config = unitRef.get('API_CONFIG');
        const key = unitRef.get('API_KEY');
      `;
      const root = j(source);
      const retrievals = detectRetrievals(j, root);

      expect(retrievals).toEqual(new Set(['API_CONFIG', 'API_KEY']));
    });

    it('should detect retrievals with type annotations', () => {
      const source = `
        const { unitRef } = TestBed.create(Service).compile();
        const repo: jest.Mocked<UserRepository> = unitRef.get(UserRepository);
      `;
      const root = j(source);
      const retrievals = detectRetrievals(j, root);

      expect(retrievals).toEqual(new Set(['UserRepository']));
    });

    it('should detect retrievals in beforeAll/beforeEach blocks', () => {
      const source = `
        describe('Service', () => {
          let unitRef: UnitReference;
          let repo: Repository;

          beforeAll(() => {
            const result = TestBed.create(Service).compile();
            unitRef = result.unitRef;
            repo = unitRef.get(Repository);
          });
        });
      `;
      const root = j(source);
      const retrievals = detectRetrievals(j, root);

      expect(retrievals).toEqual(new Set(['Repository']));
    });

    it('should handle renamed unitRef variables', () => {
      const source = `
        const { unitRef: ref } = TestBed.create(Service).compile();
        const repo = ref.get(UserRepository);
      `;
      const root = j(source);
      const retrievals = detectRetrievals(j, root);

      expect(retrievals).toEqual(new Set(['UserRepository']));
    });

    it('should not detect non-unitRef .get() calls', () => {
      const source = `
        const map = new Map();
        const value = map.get('key');
      `;
      const root = j(source);
      const retrievals = detectRetrievals(j, root);

      expect(retrievals).toEqual(new Set());
    });

    it('should handle empty file', () => {
      const source = ``;
      const root = j(source);
      const retrievals = detectRetrievals(j, root);

      expect(retrievals).toEqual(new Set());
    });

    it('should handle file with no retrievals', () => {
      const source = `
        const { unit } = TestBed.create(Service).compile();
        expect(unit).toBeDefined();
      `;
      const root = j(source);
      const retrievals = detectRetrievals(j, root);

      expect(retrievals).toEqual(new Set());
    });
  });

  describe('isDependencyRetrieved', () => {
    it('should return true when dependency is retrieved', () => {
      const source = `
        const { unitRef } = TestBed.create(Service).compile();
        const repo = unitRef.get(UserRepository);
      `;
      const root = j(source);

      expect(isDependencyRetrieved(j, root, 'UserRepository')).toBe(true);
    });

    it('should return false when dependency is not retrieved', () => {
      const source = `
        const { unitRef } = TestBed.create(Service).compile();
        const repo = unitRef.get(UserRepository);
      `;
      const root = j(source);

      expect(isDependencyRetrieved(j, root, 'CacheService')).toBe(false);
    });
  });

  describe('detectRetrievalsFromSource', () => {
    it('should detect retrievals from source string', () => {
      const source = `
        const { unitRef } = TestBed.create(Service).compile();
        const repo = unitRef.get(UserRepository);
        const cache = unitRef.get(CacheService);
      `;

      const retrievals = detectRetrievalsFromSource(j, source);

      expect(retrievals).toEqual(new Set(['UserRepository', 'CacheService']));
    });

    it('should handle complex real-world example', () => {
      const source = `
        import { TestBed } from '@automock/jest';

        describe('OrderService', () => {
          let service: OrderService;
          let orderRepo: jest.Mocked<OrderRepository>;
          let payment: jest.Mocked<PaymentGateway>;

          beforeAll(() => {
            const { unit, unitRef } = TestBed.create(OrderService)
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

            service = unit;
            orderRepo = unitRef.get(OrderRepository);
            payment = unitRef.get(PaymentGateway);
          });

          it('should create order', async () => {
            orderRepo.findById.mockResolvedValue({ id: '1', total: 100 });
            const result = await service.createOrder('1');
            expect(result.success).toBe(true);
          });
        });
      `;

      const retrievals = detectRetrievalsFromSource(j, source);

      expect(retrievals).toEqual(new Set(['OrderRepository', 'PaymentGateway']));
    });
  });
});
