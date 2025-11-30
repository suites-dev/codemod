/**
 * Validation Failure: NO_AUTOMOCK_IMPORTS
 *
 * This file should trigger a validation error because it contains
 * @automock/* imports that were not transformed to @suites/unit
 */

import { TestBed } from '@automock/jest';

class UserService {
  constructor(private httpClient: HttpClient) {}
}

class HttpClient {
  get(url: string) {
    return Promise.resolve('data');
  }
}

describe('UserService', () => {
  it('should fail validation - automock import not removed', async () => {
    const unitRef = await TestBed
      .solitary(UserService)
      .mock(HttpClient).final({ get: () => Promise.resolve('test') })
      .compile();

    const service = unitRef.unit();
    expect(service).toBeDefined();
  });
});
