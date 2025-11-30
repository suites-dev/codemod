/**
 * Validation Failure: STUBS_REPLACED
 *
 * This file should trigger validation errors because it uses
 * jest.fn() and sinon.stub() instead of stubFn()
 */

import { TestBed } from '@suites/unit';
import * as sinon from 'sinon';

class UserService {
  constructor(
    private httpClient: HttpClient,
    private logger: Logger
  ) {}
}

class HttpClient {
  get(url: string) {
    return Promise.resolve('data');
  }
}

class Logger {
  log(message: string) {
    console.log(message);
  }
}

describe('UserService', () => {
  it('should fail validation - jest.fn() not replaced', async () => {
    const unitRef = await TestBed
      .solitary(UserService)
      // ❌ Should use stubFn() instead of jest.fn()
      .mock(HttpClient).impl(() => ({
        get: jest.fn().mockResolvedValue('test data')
      }))
      .mock(Logger).impl(() => ({
        log: jest.fn()
      }))
      .compile();

    const service = unitRef.unit();
    expect(service).toBeDefined();
  });

  it('should fail validation - sinon.stub() not replaced', async () => {
    const unitRef = await TestBed
      .solitary(UserService)
      // ❌ Should use stubFn() instead of sinon.stub()
      .mock(HttpClient).impl(() => ({
        get: sinon.stub().resolves('test data')
      }))
      .mock(Logger).impl(() => ({
        log: sinon.stub()
      }))
      .compile();

    const service = unitRef.unit();
    expect(service).toBeDefined();
  });
});
