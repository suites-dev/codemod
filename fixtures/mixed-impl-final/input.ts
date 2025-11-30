import { TestBed } from '@automock/jest';

describe('NotificationService', () => {
  let service: NotificationService;
  let emailService: jest.Mocked<EmailService>;

  beforeAll(() => {
    const { unit, unitRef } = TestBed.create(NotificationService)
      .mock(EmailService)
      .using({
        send: jest.fn(),
        validate: jest.fn()
      })
      .mock(Config)
      .using({
        apiUrl: 'https://api.test.com',
        timeout: 5000,
        retryAttempts: 3
      })
      .mock(RateLimiter)
      .using({
        checkLimit: () => true,
        incrementCount: () => {}
      })
      .mock(Logger)
      .using({
        log: jest.fn()
      })
      .compile();

    service = unit;
    emailService = unitRef.get(EmailService);
  });

  it('should send notification', () => {
    emailService.send.mockResolvedValue(true);

    const result = service.notify('test@example.com', 'Hello');

    expect(emailService.send).toHaveBeenCalled();
  });
});
