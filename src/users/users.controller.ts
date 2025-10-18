import { Body, Controller, Put, Get, Post, UseGuards, Req, ConflictException, Query } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { JwtGuard } from './jwt.guard';
import { UpdateMeDto, UserProfileResponseDto, RegisterDto } from './dto';
import { 
  UserGroupsResponseDto, 
  UserExpensesResponseDto, 
  UserSummaryDto, 
  UserDuesResponseDto,
  UserExpensesQueryDto
} from './user-centric.dto';
import { UserCentricService } from './user-centric.service';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiUnauthorizedResponse, ApiBadRequestResponse, ApiConflictResponse, ApiQuery } from '@nestjs/swagger';
import { AppLogger } from '../common/app-logger.service';

@ApiTags('users')
@Controller('users')
export class UsersController {
  constructor(
    private prisma: PrismaService,
    private logger: AppLogger,
    private userCentricService: UserCentricService,
  ) {}

  @UseGuards(JwtGuard)
  @Post('register')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Complete user profile registration',
    description: 'Completes the user profile after OTP login with display name, UPI VPA, and base currency',
  })
  @ApiResponse({
    status: 200,
    description: 'User profile registered successfully',
    type: UserProfileResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Invalid or missing JWT token',
    schema: {
      example: {
        statusCode: 401,
        message: 'Unauthorized',
        error: 'Unauthorized',
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'Invalid request data',
    schema: {
      example: {
        statusCode: 400,
        message: ['displayName must be a string', 'displayName must be between 1 and 80 characters'],
        error: 'Bad Request',
      },
    },
  })
  @ApiConflictResponse({
    description: 'UPI VPA already exists',
    schema: {
      example: {
        statusCode: 409,
        message: 'UPI VPA already exists',
        error: 'Conflict',
      },
    },
  })
  async register(@Req() req: any, @Body() dto: RegisterDto): Promise<UserProfileResponseDto> {
    const userId = req.user.id;
    
    this.logger.logUserAction('User registration started', userId, {
      hasDisplayName: !!dto.displayName,
      hasUpiVpa: !!dto.upiVpa,
      baseCurrency: dto.baseCurrency || 'INR',
    });

    try {
      const user = await this.prisma.app_user.update({
        where: { id: userId },
        data: {
          display_name: dto.displayName,
          upi_vpa: dto.upiVpa?.toLowerCase() ?? undefined,
          base_currency: dto.baseCurrency ?? 'INR',
          ...(dto.upiVpa ? { upi_verified: false } : {}),
        },
        select: {
          id: true,
          phone_e164: true,
          display_name: true,
          upi_vpa: true,
          upi_verified: true,
          base_currency: true,
          created_at: true,
          updated_at: true,
        },
      });

      this.logger.logUserAction('User registration completed successfully', userId, {
        displayName: user.display_name,
        upiVpa: user.upi_vpa,
        baseCurrency: user.base_currency,
        upiVerified: user.upi_verified,
      });

      return {
        id: user.id,
        phoneE164: user.phone_e164,
        displayName: user.display_name,
        upiVpa: user.upi_vpa,
        upiVerified: user.upi_verified,
        baseCurrency: user.base_currency,
        createdAt: user.created_at,
        updatedAt: user.updated_at,
      };
    } catch (error) {
      if (error.code === 'P2002' && error.meta?.target?.includes('upi_vpa')) {
        this.logger.logUserAction('User registration failed - UPI VPA already exists', userId, {
          attemptedUpiVpa: dto.upiVpa,
        });
        throw new ConflictException('UPI VPA already exists');
      }
      
      this.logger.logError(error, { userId, operation: 'USER_REGISTRATION' });
      throw error;
    }
  }

  @UseGuards(JwtGuard)
  @Get('me')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Get current user profile',
    description: 'Returns the authenticated user\'s profile information',
  })
  @ApiResponse({
    status: 200,
    description: 'User profile retrieved successfully',
    type: UserProfileResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Invalid or missing JWT token',
    schema: {
      example: {
        statusCode: 401,
        message: 'Unauthorized',
        error: 'Unauthorized',
      },
    },
  })
  async getMe(@Req() req: any): Promise<UserProfileResponseDto> {
    const userId = req.user.id;
    
    this.logger.logUserAction('User profile retrieval started', userId);

    try {
      const user = await this.prisma.app_user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          phone_e164: true,
          display_name: true,
          upi_vpa: true,
          upi_verified: true,
          base_currency: true,
          created_at: true,
          updated_at: true,
        },
      });

      if (!user) {
        this.logger.logUserAction('User profile retrieval failed - user not found', userId);
        throw new Error('User not found');
      }

      this.logger.logUserAction('User profile retrieved successfully', userId, {
        hasDisplayName: !!user.display_name,
        hasUpiVpa: !!user.upi_vpa,
        upiVerified: user.upi_verified,
        baseCurrency: user.base_currency,
      });

      return {
        id: user.id,
        phoneE164: user.phone_e164,
        displayName: user.display_name,
        upiVpa: user.upi_vpa,
        upiVerified: user.upi_verified,
        baseCurrency: user.base_currency,
        createdAt: user.created_at,
        updatedAt: user.updated_at,
      };
    } catch (error) {
      this.logger.logError(error, { userId, operation: 'USER_PROFILE_RETRIEVAL' });
      throw error;
    }
  }

  @UseGuards(JwtGuard)
  @Put('me')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Update user profile',
    description: 'Updates the authenticated user\'s profile information including display name and UPI VPA',
  })
  @ApiResponse({
    status: 200,
    description: 'User profile updated successfully',
    type: UserProfileResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Invalid or missing JWT token',
    schema: {
      example: {
        statusCode: 401,
        message: 'Unauthorized',
        error: 'Unauthorized',
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'Invalid request data',
    schema: {
      example: {
        statusCode: 400,
        message: ['displayName must be a string', 'upiVpa must match pattern'],
        error: 'Bad Request',
      },
    },
  })
  async updateMe(@Req() req: any, @Body() dto: UpdateMeDto): Promise<UserProfileResponseDto> {
    const userId = req.user.id;
    
    this.logger.logUserAction('User profile update started', userId, {
      hasDisplayName: !!dto.displayName,
      hasUpiVpa: !!dto.upiVpa,
    });

    try {
      const user = await this.prisma.app_user.update({
        where: { id: userId },
        data: {
          display_name: dto.displayName ?? undefined,
          upi_vpa: dto.upiVpa?.toLowerCase() ?? undefined,
          ...(dto.upiVpa ? { upi_verified: false } : {}),
        },
        select: {
          id: true,
          phone_e164: true,
          display_name: true,
          upi_vpa: true,
          upi_verified: true,
          base_currency: true,
          created_at: true,
          updated_at: true,
        },
      });

      this.logger.logUserAction('User profile updated successfully', userId, {
        displayName: user.display_name,
        upiVpa: user.upi_vpa,
        upiVerified: user.upi_verified,
      });

      return {
        id: user.id,
        phoneE164: user.phone_e164,
        displayName: user.display_name,
        upiVpa: user.upi_vpa,
        upiVerified: user.upi_verified,
        baseCurrency: user.base_currency,
        createdAt: user.created_at,
        updatedAt: user.updated_at,
      };
    } catch (error) {
      this.logger.logError(error, { userId, operation: 'USER_PROFILE_UPDATE' });
      throw error;
    }
  }

  @UseGuards(JwtGuard)
  @Get('me/groups')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Get user groups with financial balances',
    description: 'Returns all groups the user belongs to with their net financial position in each group. Shows total amounts owed, due, and net balance per group.',
  })
  @ApiResponse({
    status: 200,
    description: 'User groups with balances retrieved successfully',
    type: UserGroupsResponseDto,
    schema: {
      example: {
        groups: [
          {
            id: '123e4567-e89b-12d3-a456-426614174000',
            name: 'Trip to Goa',
            currency: 'INR',
            profile_emoji: '🏖️',
            role: 'admin',
            net_amount_minor: '-1500',
            total_owed_minor: '0',
            total_due_minor: '1500',
          },
          {
            id: '123e4567-e89b-12d3-a456-426614174001',
            name: 'Office Lunch',
            currency: 'INR',
            profile_emoji: '🍕',
            role: 'member',
            net_amount_minor: '500',
            total_owed_minor: '500',
            total_due_minor: '0',
          },
        ],
      },
    },
  })
  @ApiUnauthorizedResponse({
    description: 'Invalid or missing JWT token',
    schema: {
      example: {
        statusCode: 401,
        message: 'Unauthorized',
        error: 'Unauthorized',
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'Invalid request parameters',
    schema: {
      example: {
        statusCode: 400,
        message: 'Bad Request',
        error: 'Bad Request',
      },
    },
  })
  async getUserGroups(@Req() req: any): Promise<UserGroupsResponseDto> {
    const userId = req.user.id;
    
    this.logger.logUserAction('Get user groups initiated', userId);

    try {
      const result = await this.userCentricService.getUserGroups(userId);
      
      this.logger.logUserAction('User groups retrieved successfully', userId, {
        groupCount: result.groups.length,
      });

      return result;
    } catch (error) {
      this.logger.logError(error, { userId, operation: 'GET_USER_GROUPS' });
      throw error;
    }
  }

  @UseGuards(JwtGuard)
  @Get('me/expenses')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Get user expenses with filtering and pagination',
    description: 'Returns expenses where the user is either the payer or a participant. Supports filtering by settlement status and pagination. Amounts are in minor units (e.g., 1500 = ₹15.00).',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ['paid', 'unpaid', 'all'],
    description: 'Filter expenses by settlement status. "paid" shows settled expenses, "unpaid" shows unsettled expenses, "all" shows all expenses.',
    example: 'unpaid',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number for pagination (starts from 1)',
    example: 1,
  })
  @ApiQuery({
    name: 'size',
    required: false,
    type: Number,
    description: 'Number of items per page (max 100)',
    example: 20,
  })
  @ApiResponse({
    status: 200,
    description: 'User expenses retrieved successfully',
    type: UserExpensesResponseDto,
    schema: {
      example: {
        items: [
          {
            id: 'expense-123',
            description: 'Dinner at restaurant',
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
          {
            id: 'expense-456',
            description: 'Taxi fare',
            amount_minor: '800',
            currency: 'INR',
            spent_at: '2024-01-16T10:15:00Z',
            group: {
              id: 'group-123',
              name: 'Trip to Goa',
              currency: 'INR',
            },
            payer: {
              id: 'user-456',
              display_name: 'Jane Smith',
            },
            user_share_minor: '400',
            is_payer: false,
            is_settled: true,
            note: 'Airport to hotel',
          },
        ],
        page: 1,
        size: 20,
        total: 2,
      },
    },
  })
  @ApiUnauthorizedResponse({
    description: 'Invalid or missing JWT token',
    schema: {
      example: {
        statusCode: 401,
        message: 'Unauthorized',
        error: 'Unauthorized',
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'Invalid query parameters',
    schema: {
      example: {
        statusCode: 400,
        message: ['status must be one of the following values: paid, unpaid, all', 'page must be a positive number'],
        error: 'Bad Request',
      },
    },
  })
  async getUserExpenses(
    @Req() req: any,
    @Query() query: UserExpensesQueryDto,
  ): Promise<UserExpensesResponseDto> {
    const userId = req.user.id;
    
    this.logger.logUserAction('Get user expenses initiated', userId, {
      status: query.status,
      page: query.page,
      size: query.size,
    });

    try {
      const result = await this.userCentricService.getUserExpenses(userId, query);
      
      this.logger.logUserAction('User expenses retrieved successfully', userId, {
        totalCount: result.total,
        returnedCount: result.items.length,
      });

      return result;
    } catch (error) {
      this.logger.logError(error, { userId, operation: 'GET_USER_EXPENSES' });
      throw error;
    }
  }

  @UseGuards(JwtGuard)
  @Get('me/summary')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Get user financial summary',
    description: 'Returns overall financial summary across all groups including total amounts owed, due, net position, group count, and unsettled expense count. Provides a high-level view of user\'s financial standing.',
  })
  @ApiResponse({
    status: 200,
    description: 'User financial summary retrieved successfully',
    type: UserSummaryDto,
    schema: {
      example: {
        total_owed_minor: '5000',
        total_due_minor: '3000',
        net_amount_minor: '2000',
        currency: 'INR',
        group_count: 3,
        unsettled_expense_count: 5,
      },
    },
  })
  @ApiUnauthorizedResponse({
    description: 'Invalid or missing JWT token',
    schema: {
      example: {
        statusCode: 401,
        message: 'Unauthorized',
        error: 'Unauthorized',
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'Invalid request',
    schema: {
      example: {
        statusCode: 400,
        message: 'Bad Request',
        error: 'Bad Request',
      },
    },
  })
  async getUserSummary(@Req() req: any): Promise<UserSummaryDto> {
    const userId = req.user.id;
    
    this.logger.logUserAction('Get user summary initiated', userId);

    try {
      const result = await this.userCentricService.getUserSummary(userId);
      
      this.logger.logUserAction('User summary retrieved successfully', userId, {
        groupCount: result.group_count,
        unsettledExpenseCount: result.unsettled_expense_count,
        netAmount: result.net_amount_minor,
      });

      return result;
    } catch (error) {
      this.logger.logError(error, { userId, operation: 'GET_USER_SUMMARY' });
      throw error;
    }
  }

  @UseGuards(JwtGuard)
  @Get('me/dues')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Get detailed dues breakdown per group',
    description: 'Returns per-group breakdown showing who the user owes money to and who owes money to the user. Provides detailed counterparty information for settlement planning.',
  })
  @ApiResponse({
    status: 200,
    description: 'User dues breakdown retrieved successfully',
    type: UserDuesResponseDto,
    schema: {
      example: {
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
          {
            group_id: 'group-456',
            group_name: 'Office Lunch',
            currency: 'INR',
            owes_to: [],
            owed_by: [
              {
                user_id: 'user-101',
                display_name: 'Alice Johnson',
                amount_minor: '800',
              },
            ],
            net_amount_minor: '-800',
          },
        ],
      },
    },
  })
  @ApiUnauthorizedResponse({
    description: 'Invalid or missing JWT token',
    schema: {
      example: {
        statusCode: 401,
        message: 'Unauthorized',
        error: 'Unauthorized',
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'Invalid request',
    schema: {
      example: {
        statusCode: 400,
        message: 'Bad Request',
        error: 'Bad Request',
      },
    },
  })
  async getUserDues(@Req() req: any): Promise<UserDuesResponseDto> {
    const userId = req.user.id;
    
    this.logger.logUserAction('Get user dues initiated', userId);

    try {
      const result = await this.userCentricService.getUserDues(userId);
      
      this.logger.logUserAction('User dues retrieved successfully', userId, {
        groupCount: result.groups.length,
      });

      return result;
    } catch (error) {
      this.logger.logError(error, { userId, operation: 'GET_USER_DUES' });
      throw error;
    }
  }
}
