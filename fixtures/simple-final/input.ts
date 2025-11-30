import { TestBed } from '@automock/jest';

describe('UserService', () => {
  let service: UserService;

  beforeAll(() => {
    const { unit } = TestBed.create(UserService)
      .mock(UserRepository)
      .using({
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
