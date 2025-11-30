import { TestBed } from '@suites/unit';

describe('ApiService', () => {
  let service: ApiService;

  beforeAll(async () => {
    const { unit } = await TestBed.solitary(ApiService)
      .mock('API_KEY')
      .final('test-key-123')
      .mock('API_CONFIG')
      .final({ timeout: 5000, retries: 3 })
      .compile();

    service = unit;
  });
});
