import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { 
  UserGroupsResponseDto, 
  UserExpensesResponseDto, 
  UserSummaryDto, 
  UserDuesResponseDto,
  UserExpensesQueryDto,
  UserGroupSummaryDto,
  UserExpenseDto,
  UserDueDto
} from './user-centric.dto';
import { bigintToString } from '../common/money';

@Injectable()
export class UserCentricService {
  constructor(private prisma: PrismaService) {}

  async getUserGroups(userId: string): Promise<UserGroupsResponseDto> {
    // Get all groups where user is a member
    const memberships = await this.prisma.group_member.findMany({
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

    const groupSummaries: UserGroupSummaryDto[] = [];

    for (const membership of memberships) {
      const group = membership.group;
      
      // Calculate user's net position in this group
      const balances = await this.calculateUserGroupBalances(group.id, userId);
      
      groupSummaries.push({
        id: group.id,
        name: group.name,
        currency: group.currency,
        profile_emoji: group.profile_emoji || undefined,
        role: membership.role,
        net_amount_minor: balances.netAmount.toString(),
        total_owed_minor: balances.totalOwed.toString(),
        total_due_minor: balances.totalDue.toString(),
      });
    }

    return {
      groups: groupSummaries,
    };
  }

  async getUserExpenses(
    userId: string, 
    query: UserExpensesQueryDto
  ): Promise<UserExpensesResponseDto> {
    const { status = 'all', page = 1, size = 20 } = query;
    const skip = (page - 1) * size;

    // Build where clause based on status
    let whereClause: any = {
      OR: [
        { payer_id: userId }, // User paid
        { 
          splits: {
            some: {
              member: {
                user_id: userId,
              },
            },
          },
        }, // User participated
      ],
    };

    // Note: Settlement status filtering is complex due to schema design
    // For now, we'll implement basic filtering without settlement relations
    // This can be enhanced later with proper settlement tracking

    const [expenses, total] = await Promise.all([
      this.prisma.expense.findMany({
        where: whereClause,
        include: {
          group: {
            select: {
              id: true,
              name: true,
              currency: true,
            },
          },
          payer: {
            select: {
              id: true,
              display_name: true,
            },
          },
          splits: {
            include: {
              member: {
                select: {
                  user_id: true,
                },
              },
            },
          },
        },
        orderBy: { spent_at: 'desc' },
        skip,
        take: size,
      }),
      this.prisma.expense.count({ where: whereClause }),
    ]);

    const userExpenses: UserExpenseDto[] = expenses.map(expense => {
      const userSplit = expense.splits.find(split => split.member.user_id === userId);
      const userShare = userSplit ? userSplit.share_minor : BigInt(0);
      const isPayer = expense.payer_id === userId;
      // TODO: Implement proper settlement status checking
      const isSettled = false;

      return {
        id: expense.id,
        description: expense.description,
        amount_minor: expense.amount_minor.toString(),
        currency: expense.currency,
        spent_at: expense.spent_at.toISOString(),
        group: {
          id: expense.group.id,
          name: expense.group.name,
          currency: expense.group.currency,
        },
        payer: {
          id: expense.payer.id,
          display_name: expense.payer.display_name || 'Unknown',
        },
        user_share_minor: userShare.toString(),
        is_payer: isPayer,
        is_settled: isSettled,
        note: expense.note || undefined,
      };
    });

    return {
      items: userExpenses,
      page,
      size,
      total,
    };
  }

  async getUserSummary(userId: string): Promise<UserSummaryDto> {
    // Get all groups where user is a member
    const memberships = await this.prisma.group_member.findMany({
      where: { user_id: userId },
      select: { group_id: true },
    });

    const groupIds = memberships.map(m => m.group_id);

    // Calculate total balances across all groups
    let totalOwed = BigInt(0);
    let totalDue = BigInt(0);
    let unsettledExpenseCount = 0;

    for (const groupId of groupIds) {
      const balances = await this.calculateUserGroupBalances(groupId, userId);
      totalOwed += balances.totalOwed;
      totalDue += balances.totalDue;

      // Count unsettled expenses (simplified for now)
      const unsettledCount = await this.prisma.expense.count({
        where: {
          group_id: groupId,
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
        },
      });

      unsettledExpenseCount += unsettledCount;
    }

    const netAmount = totalOwed - totalDue;

    return {
      total_owed_minor: totalOwed.toString(),
      total_due_minor: totalDue.toString(),
      net_amount_minor: netAmount.toString(),
      currency: 'INR', // Default currency, could be made dynamic
      group_count: groupIds.length,
      unsettled_expense_count: unsettledExpenseCount,
    };
  }

  async getUserDues(userId: string): Promise<UserDuesResponseDto> {
    // Get all groups where user is a member
    const memberships = await this.prisma.group_member.findMany({
      where: { user_id: userId },
      include: {
        group: {
          select: {
            id: true,
            name: true,
            currency: true,
          },
        },
      },
    });

    const groupDues: UserDueDto[] = [];

    for (const membership of memberships) {
      const group = membership.group;
      
      // Calculate detailed balances for this group
      const balances = await this.calculateDetailedGroupBalances(group.id, userId);
      
      groupDues.push({
        group_id: group.id,
        group_name: group.name,
        currency: group.currency,
        owes_to: balances.owesTo,
        owed_by: balances.owedBy,
        net_amount_minor: balances.netAmount.toString(),
      });
    }

    return {
      groups: groupDues,
    };
  }

  private async calculateUserGroupBalances(groupId: string, userId: string): Promise<{
    totalOwed: bigint;
    totalDue: bigint;
    netAmount: bigint;
  }> {
    // Get all expenses in this group where user is involved
    const expenses = await this.prisma.expense.findMany({
      where: {
        group_id: groupId,
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
      },
      include: {
        splits: {
          include: {
            member: {
              select: {
                user_id: true,
              },
            },
          },
        },
      },
    });

    let totalOwed = BigInt(0);
    let totalDue = BigInt(0);

    for (const expense of expenses) {
      const userSplit = expense.splits.find(split => split.member.user_id === userId);
      if (!userSplit) continue;

      const userShare = userSplit.share_minor;
      const isPayer = expense.payer_id === userId;

      if (isPayer) {
        // User paid, others owe them
        totalDue += userShare;
      } else {
        // User didn't pay, they owe
        totalOwed += userShare;
      }
    }

    // Subtract settlements
    const settlements = await this.prisma.settlement.findMany({
      where: {
        group_id: groupId,
        OR: [
          { payer_id: userId },
          { payee_id: userId },
        ],
        status: 'SUCCESS',
      },
    });

    for (const settlement of settlements) {
      if (settlement.payer_id === userId) {
        // User paid settlement, reduce what they owe
        totalOwed -= settlement.amount_minor;
      } else {
        // User received settlement, reduce what they're owed
        totalDue -= settlement.amount_minor;
      }
    }

    const netAmount = totalOwed - totalDue;

    return {
      totalOwed: totalOwed < 0 ? BigInt(0) : totalOwed,
      totalDue: totalDue < 0 ? BigInt(0) : totalDue,
      netAmount,
    };
  }

  private async calculateDetailedGroupBalances(groupId: string, userId: string): Promise<{
    owesTo: Array<{ user_id: string; display_name: string; amount_minor: string }>;
    owedBy: Array<{ user_id: string; display_name: string; amount_minor: string }>;
    netAmount: bigint;
  }> {
    // Get all group members
    const members = await this.prisma.group_member.findMany({
      where: { group_id: groupId },
      include: {
        user: {
          select: {
            id: true,
            display_name: true,
          },
        },
      },
    });

    const memberMap = new Map<string, { user_id: string; display_name: string }>();
    members.forEach(member => {
      memberMap.set(member.user_id, {
        user_id: member.user_id,
        display_name: member.user.display_name || 'Unknown',
      });
    });

    // Calculate pairwise balances
    const balances = new Map<string, bigint>();

    // Initialize all balances to 0
    members.forEach(member => {
      if (member.user_id !== userId) {
        balances.set(member.user_id, BigInt(0));
      }
    });

    // Process expenses
    const expenses = await this.prisma.expense.findMany({
      where: { group_id: groupId },
      include: {
        splits: {
          include: {
            member: {
              select: {
                user_id: true,
              },
            },
          },
        },
      },
    });

    for (const expense of expenses) {
      const payerId = expense.payer_id;
      
      for (const split of expense.splits) {
        const participantId = split.member.user_id;
        
        if (participantId !== payerId && participantId !== userId) {
          // This participant owes the payer
          const currentBalance = balances.get(participantId) || BigInt(0);
          balances.set(participantId, currentBalance + split.share_minor);
        } else if (participantId === userId && payerId !== userId) {
          // User owes the payer
          const currentBalance = balances.get(payerId) || BigInt(0);
          balances.set(payerId, currentBalance - split.share_minor);
        }
      }
    }

    // Process settlements
    const settlements = await this.prisma.settlement.findMany({
      where: {
        group_id: groupId,
        OR: [
          { payer_id: userId },
          { payee_id: userId },
        ],
        status: 'SUCCESS',
      },
    });

    for (const settlement of settlements) {
      if (settlement.payer_id === userId) {
        // User paid settlement
        const currentBalance = balances.get(settlement.payee_id) || BigInt(0);
        balances.set(settlement.payee_id, currentBalance + settlement.amount_minor);
      } else {
        // User received settlement
        const currentBalance = balances.get(settlement.payer_id) || BigInt(0);
        balances.set(settlement.payer_id, currentBalance - settlement.amount_minor);
      }
    }

    // Separate owes to vs owed by
    const owesTo: Array<{ user_id: string; display_name: string; amount_minor: string }> = [];
    const owedBy: Array<{ user_id: string; display_name: string; amount_minor: string }> = [];
    let netAmount = BigInt(0);

    for (const [otherUserId, balance] of balances) {
      if (balance > 0) {
        // User owes this person
        owesTo.push({
          user_id: otherUserId,
          display_name: memberMap.get(otherUserId)?.display_name || 'Unknown',
          amount_minor: balance.toString(),
        });
        netAmount += balance;
      } else if (balance < 0) {
        // This person owes user
        owedBy.push({
          user_id: otherUserId,
          display_name: memberMap.get(otherUserId)?.display_name || 'Unknown',
          amount_minor: (-balance).toString(),
        });
        netAmount += balance; // balance is negative
      }
    }

    return {
      owesTo,
      owedBy,
      netAmount,
    };
  }
}
