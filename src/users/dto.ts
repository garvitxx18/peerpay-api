import { IsOptional, IsString, Matches, Length, IsIn } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterDto {
  @ApiProperty({
    description: 'User display name',
    example: 'John Doe',
    minLength: 1,
    maxLength: 80,
  })
  @IsString()
  @Length(1, 80)
  displayName!: string;

  @ApiProperty({
    description: 'UPI Virtual Payment Address (VPA)',
    example: 'john.doe@paytm',
    pattern: '^[a-zA-Z0-9._-]{2,255}@[a-zA-Z]{2,64}$',
    required: false,
  })
  @IsOptional()
  @Matches(/^[a-zA-Z0-9._-]{2,255}@[a-zA-Z]{2,64}$/)
  upiVpa?: string;

  @ApiProperty({
    description: 'Base currency code (ISO-4217)',
    example: 'INR',
    default: 'INR',
    required: false,
  })
  @IsOptional()
  @IsString()
  @IsIn(['INR', 'USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD', 'CHF', 'CNY', 'SEK', 'NZD', 'MXN', 'SGD', 'HKD', 'NOK', 'TRY', 'RUB', 'ZAR', 'BRL', 'KRW'])
  baseCurrency?: string;
}

export class UpdateMeDto {
  @ApiProperty({
    description: 'User display name',
    example: 'John Doe',
    required: false,
  })
  @IsOptional() 
  @IsString() 
  displayName?: string;

  @ApiProperty({
    description: 'UPI Virtual Payment Address (VPA)',
    example: 'john.doe@paytm',
    pattern: '^[a-zA-Z0-9._-]{2,255}@[a-zA-Z]{2,64}$',
    required: false,
  })
  @IsOptional()
  @Matches(/^[a-zA-Z0-9._-]{2,255}@[a-zA-Z]{2,64}$/)
  upiVpa?: string;
}

export class UserProfileResponseDto {
  @ApiProperty({
    description: 'Unique user identifier',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id!: string;

  @ApiProperty({
    description: 'User phone number in E.164 format',
    example: '+1234567890',
  })
  phoneE164!: string | null;

  @ApiProperty({
    description: 'User display name',
    example: 'John Doe',
  })
  displayName!: string | null;

  @ApiProperty({
    description: 'UPI Virtual Payment Address',
    example: 'john.doe@paytm',
  })
  upiVpa!: string | null;

  @ApiProperty({
    description: 'Whether the UPI VPA is verified',
    example: false,
  })
  upiVerified!: boolean;

  @ApiProperty({
    description: 'Base currency code (ISO-4217)',
    example: 'INR',
  })
  baseCurrency!: string;

  @ApiProperty({
    description: 'User creation timestamp',
    example: '2023-01-01T00:00:00.000Z',
  })
  createdAt!: Date;

  @ApiProperty({
    description: 'User last update timestamp',
    example: '2023-01-01T00:00:00.000Z',
  })
  updatedAt!: Date;
}
