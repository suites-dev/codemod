import { TestBed, type Mocked } from '@suites/unit';

describe('UserController', () => {
  let controller: UserController;
  let userService: Mocked<UserService>;
  let authService: Mocked<AuthService>;
  let cacheService: Mocked<CacheService>;

  beforeAll(async () => {
    const { unit, unitRef } = await TestBed.solitary(UserController).compile();

    controller = unit;
    userService = unitRef.get(UserService);
    authService = unitRef.get(AuthService);
    cacheService = unitRef.get(CacheService);
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
