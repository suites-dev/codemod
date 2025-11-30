/**
 * Validation Failure: NO_FINAL_RETRIEVAL (CRITICAL)
 *
 * This file should trigger a CRITICAL validation error because it
 * retrieves a mock configured with .final() using unitRef.get()
 *
 * This will cause a runtime failure because .final() mocks are sealed
 * and cannot be retrieved.
 */

import { TestBed, type Mocked } from '@suites/unit';

class UserService {
  constructor(private httpClient: HttpClient) {}

  async getUser(id: string) {
    return this.httpClient.get(`/users/${id}`);
  }
}

class HttpClient {
  get(url: string) {
    return Promise.resolve({ data: 'user' });
  }
}

describe('UserService', () => {
  let service: UserService;
  let httpClient: Mocked<HttpClient>;

  beforeAll(async () => {
    const { unit, unitRef } = await TestBed
      .solitary(UserService)
      .mock(HttpClient).final({
        get: () => Promise.resolve({ data: 'mocked user' })
      })
      .compile();

    service = unit;

    // 🚨 CRITICAL ERROR: Cannot retrieve .final() mocks!
    // This should be .impl() instead
    httpClient = unitRef.get(HttpClient);
  });

  it('should fail at runtime - cannot retrieve .final() mock', async () => {
    // This test will fail because httpClient retrieval failed
    httpClient.get.mockReturnValue(Promise.resolve({ data: 'different' }));

    const result = await service.getUser('123');
    expect(result.data).toBe('different');
  });
});
