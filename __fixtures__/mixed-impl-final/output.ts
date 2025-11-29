import { TestBed, type Mocked } from '@suites/unit';

describe('NotificationService', () => {
  let service: NotificationService;
  let emailService: Mocked<EmailService>;

  beforeAll(async () => {
    const { unit, unitRef } = await TestBed.solitary(NotificationService)
      .mock(EmailService)
      .impl({
        send: stubFn(),
        validate: stubFn()
      })
      .mock(Config)
      .final({
        apiUrl: 'https://api.test.com',
        timeout: 5000,
        retryAttempts: 3
      })
      .mock(RateLimiter)
      .final({
        checkLimit: () => true,
        incrementCount: () => {}
      })
      .mock(Logger)
      .impl({
        log: stubFn()
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
