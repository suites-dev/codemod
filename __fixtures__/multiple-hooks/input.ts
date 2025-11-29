import { TestBed } from '@automock/jest';

describe('TaskService', () => {
  let service: TaskService;

  beforeAll(() => {
    const { unit } = TestBed.create(TaskService)
      .mock(TaskRepository)
      .using({ findAll: jest.fn() })
      .compile();

    service = unit;
  });

  beforeEach(() => {
    const { unitRef } = TestBed.create(TaskService).compile();
    const mockRepo = unitRef.get(TaskRepository);
    mockRepo.findAll.mockClear();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should create task', () => {
    const { unit, unitRef } = TestBed.create(TaskService)
      .mock(TaskRepository)
      .using({ create: jest.fn() })
      .compile();

    const taskService = unit;
    const repo = unitRef.get(TaskRepository);

    repo.create.mockResolvedValue({ id: '1' });
    taskService.createTask({ title: 'Test' });

    expect(repo.create).toHaveBeenCalled();
  });

  it('should list tasks', () => {
    const result = service.listTasks();
    expect(result).toBeDefined();
  });
});
