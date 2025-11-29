import { TestBed } from '@automock/jest';

describe('UserController', () => {
  let controller: UserController;
  let userService: jest.Mocked<UserService>;
  let authService: jest.Mocked<AuthService>;
  let cacheService: jest.Mocked<CacheService>;

  beforeAll(() => {
    const { unit, unitRef } = TestBed.create(UserController).compile();

    controller = unit;
    userService = unitRef.get(UserService) as jest.Mocked<UserService>;
    authService = unitRef.get(AuthService) as jest.Mocked<AuthService>;
    cacheService = unitRef.get(CacheService) as jest.Mocked<CacheService>;
  });

  beforeEach(() => {
    userService.findById.mockClear();
    authService.validateToken.mockClear();
  });

  it('should get user by id', async () => {
    const mockUser = { id: '1', name: 'John' };
    userService.findById.mockResolvedValue(mockUser);

    const result = await controller.getUser('1');

    expect(result).toEqual(mockUser);
    expect(userService.findById).toHaveBeenCalledWith('1');
  });
});
