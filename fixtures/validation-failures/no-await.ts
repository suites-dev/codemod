/**
 * Validation Failure: COMPILE_AWAITED
 *
 * This file should trigger a validation warning because .compile()
 * is not awaited
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
  it('should warn - .compile() not awaited', () => {
    // ⚠️ Should be: await TestBed.solitary...compile()
    const unitRef = TestBed
      .solitary(UserService)
      .mock(HttpClient).final({ get: () => Promise.resolve('test') })
      .compile();

    // This might cause issues because compile() is async
    const service = unitRef.unit();
    expect(service).toBeDefined();
  });
});
