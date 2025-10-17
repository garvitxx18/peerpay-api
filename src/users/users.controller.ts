import { Body, Controller, Put, Get, Post, UseGuards, Req, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { JwtGuard } from './jwt.guard';
import { UpdateMeDto, UserProfileResponseDto, RegisterDto } from './dto';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiUnauthorizedResponse, ApiBadRequestResponse, ApiConflictResponse } from '@nestjs/swagger';
import { AppLogger } from '../common/app-logger.service';

@ApiTags('users')
@Controller()
export class UsersController {
  constructor(
    private prisma: PrismaService,
    private logger: AppLogger,
  ) {}

  @UseGuards(JwtGuard)
  @Post('users/register')
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
}
