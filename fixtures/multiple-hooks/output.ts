import { TestBed } from '@suites/unit';

describe('TaskService', () => {
  let service: TaskService;

  beforeAll(async () => {
    const { unit } = await TestBed.solitary(TaskService)
      .mock(TaskRepository)
      .impl({ findAll: stubFn() })
      .compile();

    service = unit;
  });

  beforeEach(async () => {
    const { unitRef } = await TestBed.solitary(TaskService).compile();
    const mockRepo = unitRef.get(TaskRepository);
    mockRepo.findAll.mockClear();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should create task', async () => {
    const { unit, unitRef } = await TestBed.solitary(TaskService)
      .mock(TaskRepository)
      .impl({ create: stubFn() })
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
