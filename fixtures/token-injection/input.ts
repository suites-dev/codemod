import { TestBed } from '@automock/jest';

describe('ApiService', () => {
  let service: ApiService;

  beforeAll(() => {
    const { unit } = TestBed.create(ApiService)
      .mock('API_KEY')
      .using('test-key-123')
      .mock('API_CONFIG')
      .using({ timeout: 5000, retries: 3 })
      .compile();

    service = unit;
  });
});
