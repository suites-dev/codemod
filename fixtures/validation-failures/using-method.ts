/**
 * Validation Failure: USING_TRANSFORMED
 *
 * This file should trigger a validation error because it uses
 * .using() instead of .impl() or .final()
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
  it('should fail validation - .using() not transformed', async () => {
    // ❌ Should be .impl() or .final()
    const unitRef = await TestBed
      .solitary(UserService)
      .mock(HttpClient).using({ get: () => Promise.resolve('test') })
      .compile();

    const service = unitRef.unit();
    expect(service).toBeDefined();
  });
});
