import { Injectable, BadRequestException, ForbiddenException, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { CreateGroupDto, AddMemberDto, CreateExpenseDto, ListQueryDto, GroupResponseDto, ExpenseResponseDto, ExpenseListResponseDto, BalancesResponseDto } from './dto';
import { bigintToString } from '../common/money';

@Injectable()
export class GroupsService {
  constructor(private prisma: PrismaService) {}

  async createGroup(adminId: string, dto: CreateGroupDto): Promise<GroupResponseDto> {
    const group = await this.prisma.grp.create({
      data: {
        name: dto.name,
        admin_id: adminId,
        currency: dto.currency || 'INR',
        profile_emoji: dto.profile_emoji,
        interest_active: dto.interest_active || false,
        apr_bps: dto.apr_bps || 0,
        grace_days: dto.grace_days || 0,
        start_after_days: dto.start_after_days || 0,
        compounding: dto.compounding || 'none',
        cap_pct: dto.cap_pct,
        members: {
          create: {
            user_id: adminId,
            role: 'admin',
          },
        },
      },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                display_name: true,
                phone_e164: true,
              },
            },
          },
        },
      },
    });

    return this.mapGroupToResponse(group);
  }

  async addMember(groupId: string, requesterId: string, dto: AddMemberDto): Promise<void> {
    // Check if requester is admin
    const group = await this.prisma.grp.findUnique({
      where: { id: groupId },
      include: {
        members: {
          where: { user_id: requesterId, role: 'admin' },
        },
      },
    });

    if (!group) {
      throw new NotFoundException('Group not found');
    }

    if (group.members.length === 0) {
      throw new ForbiddenException('Only group admins can add members');
    }

    // Check if user is already a member
    const existingMember = await this.prisma.group_member.findFirst({
      where: {
        group_id: groupId,
        user_id: dto.user_id,
      },
    });

    if (existingMember) {
      throw new ConflictException('User is already a member of this group');
    }

    // Add member
    await this.prisma.group_member.create({
      data: {
        group_id: groupId,
        user_id: dto.user_id,
        role: dto.role || 'member',
        upi_vpa: dto.upi_vpa,
      },
    });

    // If role is admin, update group admin
    if (dto.role === 'admin') {
      await this.prisma.grp.update({
        where: { id: groupId },
        data: { admin_id: dto.user_id },
      });
    }
  }

  async getGroup(groupId: string): Promise<GroupResponseDto> {
    const group = await this.prisma.grp.findUnique({
      where: { id: groupId },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                display_name: true,
                phone_e164: true,
              },
            },
          },
        },
      },
    });

    if (!group) {
      throw new NotFoundException('Group not found');
    }

    return this.mapGroupToResponse(group);
  }

  async createExpense(groupId: string, dto: CreateExpenseDto): Promise<ExpenseResponseDto> {
    // Validate splits sum equals amount
    const splitsSum = dto.splits.reduce((sum, split) => sum + split.share_minor, 0);
    if (splitsSum !== dto.amount_minor) {
      throw new BadRequestException('Sum of splits must equal total amount');
    }

    // Get group members
    const groupMembers = await this.prisma.group_member.findMany({
      where: { group_id: groupId },
      include: { user: true },
    });

    const memberIds = groupMembers.map(m => m.id);
    const userIds = groupMembers.map(m => m.user_id);

    // Validate payer is member
    if (!userIds.includes(dto.payer_id)) {
      throw new BadRequestException('Payer must be a member of the group');
    }

    // Validate all split members belong to group
    const splitMemberIds = dto.splits.map(s => s.member_id);
    const invalidMembers = splitMemberIds.filter(id => !memberIds.includes(id));
    if (invalidMembers.length > 0) {
      throw new BadRequestException('All split members must belong to the group');
    }

    // Create expense with splits
    const expense = await this.prisma.expense.create({
      data: {
        group_id: groupId,
        payer_id: dto.payer_id,
        description: dto.description,
        amount_minor: BigInt(dto.amount_minor),
        currency: dto.currency || 'INR',
        spent_at: new Date(dto.spent_at),
        note: dto.note,
        splits: {
          create: dto.splits.map(split => ({
            member_id: split.member_id,
            share_minor: BigInt(split.share_minor),
            method: split.method || 'amount',
          })),
        },
      },
      include: {
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
                id: true,
              },
            },
          },
        },
      },
    });

    return this.mapExpenseToResponse(expense);
  }

  async listExpenses(groupId: string, query: ListQueryDto): Promise<ExpenseListResponseDto> {
    const page = query.page || 1;
    const size = query.size || 20;
    const skip = (page - 1) * size;

    const [expenses, total] = await Promise.all([
      this.prisma.expense.findMany({
        where: { group_id: groupId },
        include: {
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
                  id: true,
                },
              },
            },
          },
        },
        orderBy: { spent_at: 'desc' },
        skip,
        take: size,
      }),
      this.prisma.expense.count({
        where: { group_id: groupId },
      }),
    ]);

    return {
      items: expenses.map(expense => this.mapExpenseToResponse(expense)),
      page,
      size,
      total,
    };
  }

  async computeBalances(groupId: string): Promise<BalancesResponseDto> {
    // Get all expenses with splits
    const expenses = await this.prisma.expense.findMany({
      where: { group_id: groupId },
      include: {
        splits: {
          include: {
            member: {
              include: {
                user: {
                  select: {
                    id: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    // Get all settlements
    const settlements = await this.prisma.settlement.findMany({
      where: { group_id: groupId },
    });

    // Build debt map: debtorId -> creditorId -> amount
    const debtMap = new Map<string, Map<string, bigint>>();

    // Process expenses
    for (const expense of expenses) {
      for (const split of expense.splits) {
        const debtorId = split.member.user.id;
        const creditorId = expense.payer_id;

        if (debtorId !== creditorId) {
          if (!debtMap.has(debtorId)) {
            debtMap.set(debtorId, new Map());
          }
          const creditorMap = debtMap.get(debtorId)!;
          const currentDebt = creditorMap.get(creditorId) || 0n;
          creditorMap.set(creditorId, currentDebt + split.share_minor);
        }
      }
    }

    // Process settlements (reduce debt)
    for (const settlement of settlements) {
      const payerId = settlement.payer_id;
      const payeeId = settlement.payee_id;

      if (debtMap.has(payerId)) {
        const creditorMap = debtMap.get(payerId)!;
        const currentDebt = creditorMap.get(payeeId) || 0n;
        const newDebt = currentDebt - settlement.amount_minor;
        
        if (newDebt <= 0n) {
          creditorMap.delete(payeeId);
        } else {
          creditorMap.set(payeeId, newDebt);
        }
      }
    }

    // Convert to pairwise balances
    const pairs: Array<{ debtorId: string; creditorId: string; amount_minor: string }> = [];
    const processedPairs = new Set<string>();

    for (const [debtorId, creditorMap] of debtMap) {
      for (const [creditorId, amount] of creditorMap) {
        if (amount > 0n) {
          // Create a unique key for the pair (order-independent)
          const pairKey = [debtorId, creditorId].sort().join('-');
          
          if (!processedPairs.has(pairKey)) {
            pairs.push({
              debtorId,
              creditorId,
              amount_minor: amount.toString(),
            });
            processedPairs.add(pairKey);
          }
        }
      }
    }

    // Get group currency
    const group = await this.prisma.grp.findUnique({
      where: { id: groupId },
      select: { currency: true },
    });

    return {
      currency: group?.currency || 'INR',
      pairs,
    };
  }

  private mapGroupToResponse(group: any): GroupResponseDto {
    return {
      id: group.id,
      name: group.name,
      currency: group.currency,
      profile_emoji: group.profile_emoji,
      interest_policy: {
        interest_active: group.interest_active,
        apr_bps: group.apr_bps,
        grace_days: group.grace_days,
        start_after_days: group.start_after_days,
        compounding: group.compounding,
        cap_pct: group.cap_pct,
      },
      members: group.members.map((member: any) => ({
        id: member.id,
        user_id: member.user_id,
        display_name: member.user.display_name || 'Unknown',
        phone_e164: member.user.phone_e164 || '',
        role: member.role,
        upi_vpa: member.upi_vpa,
      })),
    };
  }

  private mapExpenseToResponse(expense: any): ExpenseResponseDto {
    return {
      id: expense.id,
      description: expense.description,
      amount_minor: expense.amount_minor.toString(),
      currency: expense.currency,
      spent_at: expense.spent_at.toISOString(),
      payer: {
        id: expense.payer.id,
        display_name: expense.payer.display_name || 'Unknown',
      },
      splits: expense.splits.map((split: any) => ({
        id: split.id,
        member_id: split.member_id,
        share_minor: split.share_minor.toString(),
        method: split.method,
      })),
      note: expense.note,
    };
  }
}
