import { Controller, Post, Get, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam, ApiQuery } from '@nestjs/swagger';
import { GroupsService } from './groups.service';
import { CreateGroupDto, AddMemberDto, CreateExpenseDto, ListQueryDto, GroupResponseDto, ExpenseResponseDto, ExpenseListResponseDto, BalancesResponseDto } from './dto';
import { JwtGuard } from '../users/jwt.guard';
import { AppLogger } from '../common/app-logger.service';

@ApiTags('groups')
@Controller('groups')
@UseGuards(JwtGuard)
@ApiBearerAuth('JWT-auth')
export class GroupsController {
  constructor(
    private readonly groupsService: GroupsService,
    private readonly logger: AppLogger,
  ) {}

  @Post()
  @ApiOperation({
    summary: 'Create a new group',
    description: 'Creates a new group with the current user as admin',
  })
  @ApiResponse({
    status: 201,
    description: 'Group created successfully',
    type: GroupResponseDto,
  })
  async createGroup(@Body() dto: CreateGroupDto, @Request() req: any): Promise<GroupResponseDto> {
    this.logger.logAuthEvent('Group creation initiated', req.user.id, {
      groupName: dto.name,
      currency: dto.currency,
    });

    try {
      const result = await this.groupsService.createGroup(req.user.id, dto);
      
      this.logger.logAuthEvent('Group created successfully', req.user.id, {
        groupId: result.id,
        groupName: result.name,
      });

      return result;
    } catch (error) {
      this.logger.logAuthEvent('Group creation failed', req.user.id, {
        error: error.message,
        groupName: dto.name,
      });
      throw error;
    }
  }

  @Post(':id/members')
  @ApiOperation({
    summary: 'Add member to group',
    description: 'Adds a new member to the group (admin only)',
  })
  @ApiParam({
    name: 'id',
    description: 'Group ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 201,
    description: 'Member added successfully',
  })
  async addMember(
    @Param('id') groupId: string,
    @Body() dto: AddMemberDto,
    @Request() req: any,
  ): Promise<void> {
    this.logger.logAuthEvent('Add member initiated', req.user.id, {
      groupId,
      targetUserId: dto.user_id,
      role: dto.role,
    });

    try {
      await this.groupsService.addMember(groupId, req.user.id, dto);
      
      this.logger.logAuthEvent('Member added successfully', req.user.id, {
        groupId,
        targetUserId: dto.user_id,
        role: dto.role,
      });
    } catch (error) {
      this.logger.logAuthEvent('Add member failed', req.user.id, {
        error: error.message,
        groupId,
        targetUserId: dto.user_id,
      });
      throw error;
    }
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get group details',
    description: 'Returns group details with members',
  })
  @ApiParam({
    name: 'id',
    description: 'Group ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'Group details retrieved successfully',
    type: GroupResponseDto,
  })
  async getGroup(@Param('id') groupId: string, @Request() req: any): Promise<GroupResponseDto> {
    this.logger.logAuthEvent('Get group initiated', req.user.id, {
      groupId,
    });

    try {
      const result = await this.groupsService.getGroup(groupId);
      
      this.logger.logAuthEvent('Group retrieved successfully', req.user.id, {
        groupId,
        memberCount: result.members.length,
      });

      return result;
    } catch (error) {
      this.logger.logAuthEvent('Get group failed', req.user.id, {
        error: error.message,
        groupId,
      });
      throw error;
    }
  }

  @Post(':id/expenses')
  @ApiOperation({
    summary: 'Create expense',
    description: 'Creates a new expense with splits among group members',
  })
  @ApiParam({
    name: 'id',
    description: 'Group ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 201,
    description: 'Expense created successfully',
    type: ExpenseResponseDto,
  })
  async createExpense(
    @Param('id') groupId: string,
    @Body() dto: CreateExpenseDto,
    @Request() req: any,
  ): Promise<ExpenseResponseDto> {
    this.logger.logAuthEvent('Create expense initiated', req.user.id, {
      groupId,
      description: dto.description,
      amount: dto.amount_minor,
      payerId: dto.payer_id,
    });

    try {
      const result = await this.groupsService.createExpense(groupId, dto);
      
      this.logger.logAuthEvent('Expense created successfully', req.user.id, {
        groupId,
        expenseId: result.id,
        amount: result.amount_minor,
      });

      return result;
    } catch (error) {
      this.logger.logAuthEvent('Create expense failed', req.user.id, {
        error: error.message,
        groupId,
        description: dto.description,
      });
      throw error;
    }
  }

  @Get(':id/expenses')
  @ApiOperation({
    summary: 'List group expenses',
    description: 'Returns paginated list of group expenses',
  })
  @ApiParam({
    name: 'id',
    description: 'Group ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiQuery({
    name: 'page',
    description: 'Page number',
    example: 1,
    required: false,
  })
  @ApiQuery({
    name: 'size',
    description: 'Items per page',
    example: 20,
    required: false,
  })
  @ApiResponse({
    status: 200,
    description: 'Expenses retrieved successfully',
    type: ExpenseListResponseDto,
  })
  async listExpenses(
    @Param('id') groupId: string,
    @Query() query: ListQueryDto,
    @Request() req: any,
  ): Promise<ExpenseListResponseDto> {
    this.logger.logAuthEvent('List expenses initiated', req.user.id, {
      groupId,
      page: query.page,
      size: query.size,
    });

    try {
      const result = await this.groupsService.listExpenses(groupId, query);
      
      this.logger.logAuthEvent('Expenses retrieved successfully', req.user.id, {
        groupId,
        count: result.items.length,
        total: result.total,
      });

      return result;
    } catch (error) {
      this.logger.logAuthEvent('List expenses failed', req.user.id, {
        error: error.message,
        groupId,
      });
      throw error;
    }
  }

  @Get(':id/balances')
  @ApiOperation({
    summary: 'Get group balances',
    description: 'Returns pairwise net balances between group members',
  })
  @ApiParam({
    name: 'id',
    description: 'Group ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'Balances retrieved successfully',
    type: BalancesResponseDto,
  })
  async getBalances(@Param('id') groupId: string, @Request() req: any): Promise<BalancesResponseDto> {
    this.logger.logAuthEvent('Get balances initiated', req.user.id, {
      groupId,
    });

    try {
      const result = await this.groupsService.computeBalances(groupId);
      
      this.logger.logAuthEvent('Balances retrieved successfully', req.user.id, {
        groupId,
        pairCount: result.pairs.length,
      });

      return result;
    } catch (error) {
      this.logger.logAuthEvent('Get balances failed', req.user.id, {
        error: error.message,
        groupId,
      });
      throw error;
    }
  }
}
