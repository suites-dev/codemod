import { TestBed } from '@suites/unit';

describe('UserService', () => {
  let service: UserService;

  beforeAll(async () => {
    const { unit } = await TestBed.solitary(UserService)
      .mock(UserRepository)
      .final({
        findById: (id: string) => Promise.resolve({ id, name: 'Test' })
      })
      .compile();

    service = unit;
  });

  it('should get user', async () => {
    const user = await service.getUser('1');
    expect(user.name).toBe('Test');
  });
});
