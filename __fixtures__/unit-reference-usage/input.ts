import { TestBed } from '@automock/jest';
import { UnitReference } from '@automock/core';

describe('ProductService', () => {
  let service: ProductService;
  let unitRef: UnitReference;
  let repository: jest.Mocked<ProductRepository>;

  beforeAll(() => {
    const testBed = TestBed.create(ProductService)
      .mock(ProductRepository)
      .using({
        find: jest.fn(),
        save: jest.fn(),
        delete: jest.fn()
      })
      .compile();

    service = testBed.unit;
    unitRef = testBed.unitRef;
    repository = unitRef.get(ProductRepository);
  });

  it('should find product', async () => {
    const mockProduct = { id: '1', name: 'Widget' };
    repository.find.mockResolvedValue(mockProduct);

    const result = await service.findProduct('1');

    expect(result).toEqual(mockProduct);
  });
});
