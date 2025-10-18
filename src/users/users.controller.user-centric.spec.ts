import { Test, TestingModule } from '@nestjs/testing';
import { UsersController } from './users.controller';
import { PrismaService } from '../prisma.service';
import { UserCentricService } from './user-centric.service';
import { AppLogger } from '../common/app-logger.service';
import { JwtGuard } from './jwt.guard';
import { UserGroupsResponseDto, UserExpensesResponseDto, UserSummaryDto, UserDuesResponseDto } from './user-centric.dto';

describe('UsersController - User Centric Endpoints', () => {
  let controller: UsersController;
  let userCentricService: UserCentricService;

  const mockPrismaService = {
    app_user: {
      update: jest.fn(),
      findUnique: jest.fn(),
    },
  };

  const mockUserCentricService = {
    getUserGroups: jest.fn(),
    getUserExpenses: jest.fn(),
    getUserSummary: jest.fn(),
    getUserDues: jest.fn(),
  };

  const mockAppLogger = {
    logUserAction: jest.fn(),
    logError: jest.fn(),
    log: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
    verbose: jest.fn(),
    logApiCall: jest.fn(),
    logDatabaseOperation: jest.fn(),
    logAuthEvent: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: UserCentricService,
          useValue: mockUserCentricService,
        },
        {
          provide: AppLogger,
          useValue: mockAppLogger,
        },
      ],
    })
      .overrideGuard(JwtGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<UsersController>(UsersController);
    userCentricService = module.get<UserCentricService>(UserCentricService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /users/me/groups', () => {
    it('should return user groups successfully', async () => {
      const mockRequest = { user: { id: 'user-123' } };
      const mockResponse: UserGroupsResponseDto = {
        groups: [
          {
            id: 'group-123',
            name: 'Trip to Goa',
            currency: 'INR',
            profile_emoji: '🏖️',
            role: 'admin',
            net_amount_minor: '-1500',
            total_owed_minor: '1500',
            total_due_minor: '3000',
          },
        ],
      };

      mockUserCentricService.getUserGroups.mockResolvedValue(mockResponse);

      const result = await controller.getUserGroups(mockRequest);

      expect(result).toEqual(mockResponse);
      expect(mockUserCentricService.getUserGroups).toHaveBeenCalledWith('user-123');
      expect(mockAppLogger.logUserAction).toHaveBeenCalledWith(
        'Get user groups initiated',
        'user-123'
      );
      expect(mockAppLogger.logUserAction).toHaveBeenCalledWith(
        'User groups retrieved successfully',
        'user-123',
        { groupCount: 1 }
      );
    });

    it('should handle errors and log them', async () => {
      const mockRequest = { user: { id: 'user-123' } };
      const error = new Error('Database error');

      mockUserCentricService.getUserGroups.mockRejectedValue(error);

      await expect(controller.getUserGroups(mockRequest)).rejects.toThrow('Database error');

      expect(mockAppLogger.logError).toHaveBeenCalledWith(
        error,
        { userId: 'user-123', operation: 'GET_USER_GROUPS' }
      );
    });
  });

  describe('GET /users/me/expenses', () => {
    it('should return user expenses with default query parameters', async () => {
      const mockRequest = { user: { id: 'user-123' } };
      const mockQuery = { status: 'all' as const, page: 1, size: 20 };
      const mockResponse: UserExpensesResponseDto = {
        items: [
          {
            id: 'expense-1',
            description: 'Dinner',
            amount_minor: '3000',
            currency: 'INR',
            spent_at: '2024-01-15T19:30:00Z',
            group: {
              id: 'group-123',
              name: 'Trip to Goa',
              currency: 'INR',
            },
            payer: {
              id: 'user-123',
              display_name: 'John Doe',
            },
            user_share_minor: '1500',
            is_payer: true,
            is_settled: false,
            note: 'Great food!',
          },
        ],
        page: 1,
        size: 20,
        total: 1,
      };

      mockUserCentricService.getUserExpenses.mockResolvedValue(mockResponse);

      const result = await controller.getUserExpenses(mockRequest, mockQuery);

      expect(result).toEqual(mockResponse);
      expect(mockUserCentricService.getUserExpenses).toHaveBeenCalledWith('user-123', mockQuery);
      expect(mockAppLogger.logUserAction).toHaveBeenCalledWith(
        'Get user expenses initiated',
        'user-123',
        { status: 'all', page: 1, size: 20 }
      );
    });

    it('should handle custom query parameters', async () => {
      const mockRequest = { user: { id: 'user-123' } };
      const mockQuery = { status: 'unpaid' as const, page: 2, size: 10 };
      const mockResponse: UserExpensesResponseDto = {
        items: [],
        page: 2,
        size: 10,
        total: 0,
      };

      mockUserCentricService.getUserExpenses.mockResolvedValue(mockResponse);

      const result = await controller.getUserExpenses(mockRequest, mockQuery);

      expect(result).toEqual(mockResponse);
      expect(mockUserCentricService.getUserExpenses).toHaveBeenCalledWith('user-123', mockQuery);
    });
  });

  describe('GET /users/me/summary', () => {
    it('should return user financial summary', async () => {
      const mockRequest = { user: { id: 'user-123' } };
      const mockResponse: UserSummaryDto = {
        total_owed_minor: '5000',
        total_due_minor: '3000',
        net_amount_minor: '2000',
        currency: 'INR',
        group_count: 3,
        unsettled_expense_count: 5,
      };

      mockUserCentricService.getUserSummary.mockResolvedValue(mockResponse);

      const result = await controller.getUserSummary(mockRequest);

      expect(result).toEqual(mockResponse);
      expect(mockUserCentricService.getUserSummary).toHaveBeenCalledWith('user-123');
      expect(mockAppLogger.logUserAction).toHaveBeenCalledWith(
        'Get user summary initiated',
        'user-123'
      );
      expect(mockAppLogger.logUserAction).toHaveBeenCalledWith(
        'User summary retrieved successfully',
        'user-123',
        {
          groupCount: 3,
          unsettledExpenseCount: 5,
          netAmount: '2000',
        }
      );
    });
  });

  describe('GET /users/me/dues', () => {
    it('should return user dues breakdown', async () => {
      const mockRequest = { user: { id: 'user-123' } };
      const mockResponse: UserDuesResponseDto = {
        groups: [
          {
            group_id: 'group-123',
            group_name: 'Trip to Goa',
            currency: 'INR',
            owes_to: [
              {
                user_id: 'user-456',
                display_name: 'Jane Smith',
                amount_minor: '1500',
              },
            ],
            owed_by: [
              {
                user_id: 'user-789',
                display_name: 'Bob Wilson',
                amount_minor: '2000',
              },
            ],
            net_amount_minor: '500',
          },
        ],
      };

      mockUserCentricService.getUserDues.mockResolvedValue(mockResponse);

      const result = await controller.getUserDues(mockRequest);

      expect(result).toEqual(mockResponse);
      expect(mockUserCentricService.getUserDues).toHaveBeenCalledWith('user-123');
      expect(mockAppLogger.logUserAction).toHaveBeenCalledWith(
        'Get user dues initiated',
        'user-123'
      );
      expect(mockAppLogger.logUserAction).toHaveBeenCalledWith(
        'User dues retrieved successfully',
        'user-123',
        { groupCount: 1 }
      );
    });
  });
});
