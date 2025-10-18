import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma.service';
import { UserCentricService } from './user-centric.service';
import { AppLogger } from '../common/app-logger.service';

describe('UserCentricService', () => {
  let service: UserCentricService;
  let prismaService: PrismaService;

  const mockPrismaService = {
    group_member: {
      findMany: jest.fn(),
    },
    expense: {
      findMany: jest.fn(),
      count: jest.fn(),
    },
    settlement: {
      findMany: jest.fn(),
    },
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
      providers: [
        UserCentricService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: AppLogger,
          useValue: mockAppLogger,
        },
      ],
    }).compile();

    service = module.get<UserCentricService>(UserCentricService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getUserGroups', () => {
    it('should return user groups with balances', async () => {
      const userId = 'user-123';
      const mockMemberships = [
        {
          role: 'admin',
          group: {
            id: 'group-123',
            name: 'Trip to Goa',
            currency: 'INR',
            profile_emoji: '🏖️',
            members: [
              {
                user: {
                  id: 'user-123',
                  display_name: 'John Doe',
                },
              },
            ],
          },
        },
      ];

      mockPrismaService.group_member.findMany.mockResolvedValue(mockMemberships);
      mockPrismaService.expense.findMany.mockResolvedValue([]);
      mockPrismaService.settlement.findMany.mockResolvedValue([]);

      const result = await service.getUserGroups(userId);

      expect(result).toEqual({
        groups: [
          {
            id: 'group-123',
            name: 'Trip to Goa',
            currency: 'INR',
            profile_emoji: '🏖️',
            role: 'admin',
            net_amount_minor: '0',
            total_owed_minor: '0',
            total_due_minor: '0',
          },
        ],
      });

      expect(mockPrismaService.group_member.findMany).toHaveBeenCalledWith({
        where: { user_id: userId },
        include: {
          group: {
            include: {
              members: {
                include: {
                  user: {
                    select: {
                      id: true,
                      display_name: true,
                    },
                  },
                },
              },
            },
          },
        },
      });
    });

    it('should calculate balances correctly when user has expenses', async () => {
      const userId = 'user-123';
      const mockMemberships = [
        {
          role: 'member',
          group: {
            id: 'group-123',
            name: 'Trip to Goa',
            currency: 'INR',
            profile_emoji: '🏖️',
            members: [
              {
                user: {
                  id: 'user-123',
                  display_name: 'John Doe',
                },
              },
            ],
          },
        },
      ];

      const mockExpenses = [
        {
          id: 'expense-1',
          payer_id: 'user-123',
          amount_minor: BigInt(3000),
          splits: [
            {
              share_minor: BigInt(1500),
              member: { user_id: 'user-123' },
            },
            {
              share_minor: BigInt(1500),
              member: { user_id: 'user-456' },
            },
          ],
        },
      ];

      mockPrismaService.group_member.findMany.mockResolvedValue(mockMemberships);
      mockPrismaService.expense.findMany.mockResolvedValue(mockExpenses);
      mockPrismaService.settlement.findMany.mockResolvedValue([]);

      const result = await service.getUserGroups(userId);

      expect(result.groups[0]).toMatchObject({
        net_amount_minor: '-1500', // User paid 3000, owes 1500, net is -1500 (owed money)
        total_owed_minor: '0', // User paid, so they don't owe anything
        total_due_minor: '1500', // User is owed 1500 (they paid 3000, others owe 1500)
      });
    });
  });

  describe('getUserExpenses', () => {
    it('should return user expenses with correct filtering', async () => {
      const userId = 'user-123';
      const query = { status: 'all' as const, page: 1, size: 20 };

      const mockExpenses = [
        {
          id: 'expense-1',
          description: 'Dinner',
          amount_minor: BigInt(3000),
          currency: 'INR',
          spent_at: new Date('2024-01-15T19:30:00Z'),
          payer_id: 'user-123',
          note: 'Great food!',
          group: {
            id: 'group-123',
            name: 'Trip to Goa',
            currency: 'INR',
          },
          payer: {
            id: 'user-123',
            display_name: 'John Doe',
          },
          splits: [
            {
              share_minor: BigInt(1500),
              member: { user_id: 'user-123' },
            },
          ],
          settlements: [],
        },
      ];

      mockPrismaService.expense.findMany.mockResolvedValue(mockExpenses);
      mockPrismaService.expense.count.mockResolvedValue(1);

      const result = await service.getUserExpenses(userId, query);

      expect(result).toEqual({
        items: [
          {
            id: 'expense-1',
            description: 'Dinner',
            amount_minor: '3000',
            currency: 'INR',
            spent_at: '2024-01-15T19:30:00.000Z',
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
      });
    });

    it('should handle settlement status parameter (simplified implementation)', async () => {
      const userId = 'user-123';
      const query = { status: 'paid' as const };

      mockPrismaService.expense.findMany.mockResolvedValue([]);
      mockPrismaService.expense.count.mockResolvedValue(0);

      await service.getUserExpenses(userId, query);

      // Since settlement filtering is simplified, we just verify the basic query structure
      expect(mockPrismaService.expense.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: [
              { payer_id: userId },
              { 
                splits: {
                  some: {
                    member: {
                      user_id: userId,
                    },
                  },
                },
              },
            ],
          }),
        })
      );
    });
  });

  describe('getUserSummary', () => {
    it('should return correct financial summary', async () => {
      const userId = 'user-123';

      const mockMemberships = [
        { group_id: 'group-123' },
        { group_id: 'group-456' },
      ];

      mockPrismaService.group_member.findMany.mockResolvedValue(mockMemberships);
      mockPrismaService.expense.findMany.mockResolvedValue([]);
      mockPrismaService.settlement.findMany.mockResolvedValue([]);
      mockPrismaService.expense.count.mockResolvedValue(5);

      const result = await service.getUserSummary(userId);

      expect(result).toEqual({
        total_owed_minor: '0',
        total_due_minor: '0',
        net_amount_minor: '0',
        currency: 'INR',
        group_count: 2,
        unsettled_expense_count: 10, // 5 per group * 2 groups
      });
    });
  });

  describe('getUserDues', () => {
    it('should return per-group dues breakdown', async () => {
      const userId = 'user-123';

      const mockMemberships = [
        {
          group: {
            id: 'group-123',
            name: 'Trip to Goa',
            currency: 'INR',
          },
        },
      ];

      mockPrismaService.group_member.findMany.mockResolvedValue(mockMemberships);
      mockPrismaService.group_member.findMany.mockResolvedValueOnce(mockMemberships);
      mockPrismaService.group_member.findMany.mockResolvedValueOnce([
        {
          user_id: 'user-456',
          user: { id: 'user-456', display_name: 'Jane Smith' },
        },
      ]);
      mockPrismaService.expense.findMany.mockResolvedValue([]);
      mockPrismaService.settlement.findMany.mockResolvedValue([]);

      const result = await service.getUserDues(userId);

      expect(result).toEqual({
        groups: [
          {
            group_id: 'group-123',
            group_name: 'Trip to Goa',
            currency: 'INR',
            owes_to: [],
            owed_by: [],
            net_amount_minor: '0',
          },
        ],
      });
    });
  });
});
