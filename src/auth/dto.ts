import { IsString, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SendOtpDto {
  @ApiProperty({
    description: 'Phone number in E.164 format (e.g., +1234567890)',
    example: '+1234567890',
    pattern: '^\\+[0-9]{10,15}$',
  })
  @IsString()
  @Matches(/^\+[0-9]{10,15}$/)
  phone!: string;
}

export class VerifyOtpDto {
  @ApiProperty({
    description: 'Phone number in E.164 format (e.g., +1234567890)',
    example: '+1234567890',
  })
  @IsString() 
  phone!: string;

  @ApiProperty({
    description: '6-digit OTP code received via SMS',
    example: '123456',
    minLength: 6,
    maxLength: 6,
  })
  @IsString() 
  code!: string;
}

export class SendOtpResponseDto {
  @ApiProperty({
    description: 'Indicates if the OTP was sent successfully',
    example: true,
  })
  ok!: boolean;
}

export class RefreshTokenDto {
  @ApiProperty({
    description: 'JWT refresh token for token renewal',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  @IsString()
  refreshToken!: string;
}

export class VerifyOtpResponseDto {
  @ApiProperty({
    description: 'JWT access token for authenticated requests',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  accessToken!: string;

  @ApiProperty({
    description: 'JWT refresh token for token renewal',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  refreshToken!: string;

  @ApiProperty({
    description: 'Unique user identifier',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  userId!: string;
}

export class RefreshTokenResponseDto {
  @ApiProperty({
    description: 'New JWT access token for authenticated requests',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  accessToken!: string;

  @ApiProperty({
    description: 'New JWT refresh token for token renewal',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  refreshToken!: string;

  @ApiProperty({
    description: 'Unique user identifier',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  userId!: string;
}

export class LogoutDto {
  @ApiProperty({
    description: 'Whether to logout from all sessions or just current session',
    example: false,
    required: false,
  })
  all?: boolean;
}

export class LogoutResponseDto {
  @ApiProperty({
    description: 'Indicates if logout was successful',
    example: true,
  })
  success!: boolean;
}
