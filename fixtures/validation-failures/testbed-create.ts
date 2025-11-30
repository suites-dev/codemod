/**
 * Validation Failure: TESTBED_TRANSFORMED
 *
 * This file should trigger a validation error because it uses
 * TestBed.create() instead of TestBed.solitary()
 */

import { TestBed } from '@suites/unit';

class UserService {
  constructor(private httpClient: HttpClient) {}
}

class HttpClient {
  get(url: string) {
    return Promise.resolve('data');
  }
}

describe('UserService', () => {
  it('should fail validation - TestBed.create not transformed', async () => {
    // ❌ Should be TestBed.solitary()
    const unitRef = await TestBed
      .create(UserService)
      .mock(HttpClient).final({ get: () => Promise.resolve('test') })
      .compile();

    const service = unitRef.unit();
    expect(service).toBeDefined();
  });
});
