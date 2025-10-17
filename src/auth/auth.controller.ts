import { Body, Controller, Post, UseGuards, Request } from '@nestjs/common';
import { AuthService } from './auth.service';
import { SendOtpDto, VerifyOtpDto, SendOtpResponseDto, VerifyOtpResponseDto, RefreshTokenDto, RefreshTokenResponseDto, LogoutDto, LogoutResponseDto } from './dto';
import { ApiTags, ApiOperation, ApiResponse, ApiBadRequestResponse, ApiUnauthorizedResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AppLogger } from '../common/app-logger.service';
import { JwtGuard } from '../users/jwt.guard';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly logger: AppLogger,
  ) {}

  @Post('otp/send')
  @ApiOperation({
    summary: 'Send OTP to phone number',
    description: 'Sends a 6-digit OTP code to the provided phone number for authentication',
  })
  @ApiResponse({
    status: 200,
    description: 'OTP sent successfully',
    type: SendOtpResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Invalid phone number format',
    schema: {
      example: {
        statusCode: 400,
        message: 'invalid phone',
        error: 'Bad Request',
      },
    },
  })
  async send(@Body() dto: SendOtpDto) {
    this.logger.logAuthEvent('OTP send request initiated', undefined, {
      phone: dto.phone,
    });

    try {
      const result = await this.auth.sendOtp(dto.phone);
      
      this.logger.logAuthEvent('OTP sent successfully', undefined, {
        phone: dto.phone,
      });

      return result;
    } catch (error) {
      this.logger.logAuthEvent('OTP send failed', undefined, {
        phone: dto.phone,
        error: error.message,
      });
      throw error;
    }
  }

  @Post('otp/verify')
  @ApiOperation({
    summary: 'Verify OTP and authenticate user',
    description: 'Verifies the OTP code and returns JWT tokens for authenticated access',
  })
  @ApiResponse({
    status: 200,
    description: 'OTP verified successfully, user authenticated',
    type: VerifyOtpResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Invalid request data',
    schema: {
      example: {
        statusCode: 400,
        message: ['phone must be a string', 'code must be a string'],
        error: 'Bad Request',
      },
    },
  })
  @ApiUnauthorizedResponse({
    description: 'Invalid or expired OTP',
    schema: {
      example: {
        statusCode: 401,
        message: 'Invalid code',
        error: 'Unauthorized',
      },
    },
  })
  async verify(@Body() dto: VerifyOtpDto) {
    this.logger.logAuthEvent('OTP verification request initiated', undefined, {
      phone: dto.phone,
      codeLength: dto.code.length,
    });

    try {
      const result = await this.auth.verifyOtp(dto.phone, dto.code);
      
      this.logger.logAuthEvent('OTP verification successful - user authenticated', result.userId, {
        phone: dto.phone,
      });

      return result;
    } catch (error) {
      this.logger.logAuthEvent('OTP verification failed', undefined, {
        phone: dto.phone,
        error: error.message,
      });
      throw error;
    }
  }

  @Post('refresh')
  @ApiOperation({
    summary: 'Refresh access token',
    description: 'Uses a valid refresh token to get a new access token and refresh token',
  })
  @ApiResponse({
    status: 200,
    description: 'Tokens refreshed successfully',
    type: RefreshTokenResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Invalid request data',
    schema: {
      example: {
        statusCode: 400,
        message: ['refreshToken must be a string'],
        error: 'Bad Request',
      },
    },
  })
  @ApiUnauthorizedResponse({
    description: 'Invalid or expired refresh token',
    schema: {
      example: {
        statusCode: 401,
        message: 'Invalid refresh token',
        error: 'Unauthorized',
      },
    },
  })
  async refresh(@Body() dto: RefreshTokenDto): Promise<RefreshTokenResponseDto> {
    this.logger.logAuthEvent('Token refresh request initiated', undefined, {
      refreshTokenLength: dto.refreshToken.length,
    });

    try {
      const result = await this.auth.refreshToken(dto.refreshToken);
      
      this.logger.logAuthEvent('Token refresh successful', result.userId, {
        newAccessTokenExpiresIn: '60 minutes',
        newRefreshTokenExpiresIn: '30 days',
      });

      return result;
    } catch (error) {
      this.logger.logAuthEvent('Token refresh failed', undefined, {
        error: error.message,
      });
      throw error;
    }
  }

  @Post('logout')
  @UseGuards(JwtGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Logout user session(s)',
    description: 'Logs out the user from current session or all sessions',
  })
  @ApiResponse({
    status: 200,
    description: 'Logout successful',
    type: LogoutResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Invalid or missing authentication token',
    schema: {
      example: {
        statusCode: 401,
        message: 'Unauthorized',
        error: 'Unauthorized',
      },
    },
  })
  async logout(@Body() dto: LogoutDto, @Request() req: any): Promise<LogoutResponseDto> {
    this.logger.logAuthEvent('Logout request initiated', req.user.id, {
      logoutAll: dto.all,
    });

    try {
      // Extract session ID from refresh token if available
      let currentSid: string | undefined;
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        try {
          const token = authHeader.substring(7);
          const decoded = this.auth['jwt'].decode(token);
          if (decoded && decoded.typ === 'refresh' && decoded.sid) {
            currentSid = decoded.sid;
          }
        } catch {
          // Ignore token parsing errors
        }
      }

      const result = await this.auth.logout(req.user.id, dto.all, currentSid);
      
      this.logger.logAuthEvent('Logout successful', req.user.id, {
        logoutAll: dto.all,
        sessionDeleted: currentSid || 'all',
      });

      return result;
    } catch (error) {
      this.logger.logAuthEvent('Logout failed', req.user.id, {
        error: error.message,
      });
      throw error;
    }
  }
}
