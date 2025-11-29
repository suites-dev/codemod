import { TestBed, type UnitReference, type Mocked } from '@suites/unit';

describe('ProductService', () => {
  let service: ProductService;
  let unitRef: UnitReference;
  let repository: Mocked<ProductRepository>;

  beforeAll(async () => {
    const testBed = await TestBed.solitary(ProductService)
      .mock(ProductRepository)
      .impl({
        find: stubFn(),
        save: stubFn(),
        delete: stubFn()
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
