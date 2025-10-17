import { IsString, IsOptional, IsEnum, IsNumber, IsBoolean, IsArray, ValidateNested, IsUUID, IsDateString, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

// Group DTOs
export class CreateGroupDto {
  @ApiProperty({
    description: 'Group name',
    example: 'Trip to Goa',
  })
  @IsString()
  name!: string;

  @ApiProperty({
    description: 'Currency code (ISO 4217)',
    example: 'INR',
    required: false,
  })
  @IsOptional()
  @IsString()
  @IsEnum(['INR', 'USD', 'EUR', 'GBP'])
  currency?: 'INR' | 'USD' | 'EUR' | 'GBP';

  @ApiProperty({
    description: 'Whether interest calculation is active',
    example: false,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  interest_active?: boolean;

  @ApiProperty({
    description: 'Annual Percentage Rate in basis points (1200 = 12.00%)',
    example: 1200,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(5000)
  apr_bps?: number;

  @ApiProperty({
    description: 'Grace period in days before interest starts',
    example: 7,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  grace_days?: number;

  @ApiProperty({
    description: 'Days after expense before interest starts',
    example: 30,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  start_after_days?: number;

  @ApiProperty({
    description: 'Interest compounding frequency',
    example: 'monthly',
    required: false,
  })
  @IsOptional()
  @IsEnum(['none', 'daily', 'monthly'])
  compounding?: 'none' | 'daily' | 'monthly';

  @ApiProperty({
    description: 'Interest cap as percentage (0-100)',
    example: 25,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  cap_pct?: number;

  @ApiProperty({
    description: 'Group profile emoji',
    example: '🏖️',
    required: false,
  })
  @IsOptional()
  @IsString()
  profile_emoji?: string;
}

export class AddMemberDto {
  @ApiProperty({
    description: 'User ID to add to group',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  user_id!: string;

  @ApiProperty({
    description: 'Member role in group',
    example: 'member',
    required: false,
  })
  @IsOptional()
  @IsEnum(['member', 'admin'])
  role?: 'member' | 'admin';

  @ApiProperty({
    description: 'UPI VPA for payments',
    example: 'user@paytm',
    required: false,
  })
  @IsOptional()
  @IsString()
  upi_vpa?: string;
}

export class ListQueryDto {
  @ApiProperty({
    description: 'Page number for pagination',
    example: 1,
    required: false,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiProperty({
    description: 'Number of items per page',
    example: 20,
    required: false,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  size?: number = 20;
}

// Expense DTOs
export class CreateExpenseSplitDto {
  @ApiProperty({
    description: 'Group member ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  member_id!: string;

  @ApiProperty({
    description: 'Share amount in minor units',
    example: 1500,
  })
  @IsNumber()
  share_minor!: number;

  @ApiProperty({
    description: 'Split method',
    example: 'amount',
    required: false,
  })
  @IsOptional()
  @IsEnum(['equal', 'amount', 'percent'])
  method?: 'equal' | 'amount' | 'percent';
}

export class CreateExpenseDto {
  @ApiProperty({
    description: 'Expense description',
    example: 'Dinner at restaurant',
  })
  @IsString()
  description!: string;

  @ApiProperty({
    description: 'Total amount in minor units',
    example: 3000,
  })
  @IsNumber()
  amount_minor!: number;

  @ApiProperty({
    description: 'Currency code (ISO 4217)',
    example: 'INR',
    required: false,
  })
  @IsOptional()
  @IsString()
  @IsEnum(['INR', 'USD', 'EUR', 'GBP'])
  currency?: 'INR' | 'USD' | 'EUR' | 'GBP';

  @ApiProperty({
    description: 'User ID who paid the expense',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  payer_id!: string;

  @ApiProperty({
    description: 'When the expense was incurred (ISO 8601)',
    example: '2024-01-15T19:30:00Z',
  })
  @IsDateString()
  spent_at!: string;

  @ApiProperty({
    description: 'Additional note',
    example: 'Great food!',
    required: false,
  })
  @IsOptional()
  @IsString()
  note?: string;

  @ApiProperty({
    description: 'Expense splits among members',
    type: [CreateExpenseSplitDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateExpenseSplitDto)
  splits!: CreateExpenseSplitDto[];
}

// Response DTOs
export class GroupMemberResponseDto {
  @ApiProperty({
    description: 'Member ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id!: string;

  @ApiProperty({
    description: 'User ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  user_id!: string;

  @ApiProperty({
    description: 'User display name',
    example: 'John Doe',
  })
  display_name!: string;

  @ApiProperty({
    description: 'User phone number',
    example: '+919876543210',
  })
  phone_e164!: string;

  @ApiProperty({
    description: 'Member role',
    example: 'member',
  })
  role!: string;

  @ApiProperty({
    description: 'UPI VPA',
    example: 'john@paytm',
    required: false,
  })
  upi_vpa?: string;
}

export class GroupResponseDto {
  @ApiProperty({
    description: 'Group ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id!: string;

  @ApiProperty({
    description: 'Group name',
    example: 'Trip to Goa',
  })
  name!: string;

  @ApiProperty({
    description: 'Group currency',
    example: 'INR',
  })
  currency!: string;

  @ApiProperty({
    description: 'Group profile emoji',
    example: '🏖️',
    required: false,
  })
  profile_emoji?: string;

  @ApiProperty({
    description: 'Interest policy',
    example: {
      interest_active: false,
      apr_bps: 1200,
      grace_days: 7,
      start_after_days: 30,
      compounding: 'monthly',
      cap_pct: 25,
    },
  })
  interest_policy!: {
    interest_active: boolean;
    apr_bps: number;
    grace_days: number;
    start_after_days: number;
    compounding: string;
    cap_pct?: number;
  };

  @ApiProperty({
    description: 'Group members',
    type: [GroupMemberResponseDto],
  })
  members!: GroupMemberResponseDto[];
}

export class ExpenseSplitResponseDto {
  @ApiProperty({
    description: 'Split ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id!: string;

  @ApiProperty({
    description: 'Member ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  member_id!: string;

  @ApiProperty({
    description: 'Share amount in minor units',
    example: '1500',
  })
  share_minor!: string;

  @ApiProperty({
    description: 'Split method',
    example: 'amount',
  })
  method!: string;
}

export class ExpenseResponseDto {
  @ApiProperty({
    description: 'Expense ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id!: string;

  @ApiProperty({
    description: 'Expense description',
    example: 'Dinner at restaurant',
  })
  description!: string;

  @ApiProperty({
    description: 'Total amount in minor units',
    example: '3000',
  })
  amount_minor!: string;

  @ApiProperty({
    description: 'Currency code',
    example: 'INR',
  })
  currency!: string;

  @ApiProperty({
    description: 'When expense was incurred',
    example: '2024-01-15T19:30:00Z',
  })
  spent_at!: string;

  @ApiProperty({
    description: 'Payer information',
    example: {
      id: '123e4567-e89b-12d3-a456-426614174000',
      display_name: 'John Doe',
    },
  })
  payer!: {
    id: string;
    display_name: string;
  };

  @ApiProperty({
    description: 'Expense splits',
    type: [ExpenseSplitResponseDto],
  })
  splits!: ExpenseSplitResponseDto[];

  @ApiProperty({
    description: 'Additional note',
    example: 'Great food!',
    required: false,
  })
  note?: string;
}

export class ExpenseListResponseDto {
  @ApiProperty({
    description: 'List of expenses',
    type: [ExpenseResponseDto],
  })
  items!: ExpenseResponseDto[];

  @ApiProperty({
    description: 'Current page number',
    example: 1,
  })
  page!: number;

  @ApiProperty({
    description: 'Items per page',
    example: 20,
  })
  size!: number;

  @ApiProperty({
    description: 'Total number of expenses',
    example: 45,
  })
  total!: number;
}

export class BalancePairDto {
  @ApiProperty({
    description: 'User ID who owes money',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  debtorId!: string;

  @ApiProperty({
    description: 'User ID who is owed money',
    example: '123e4567-e89b-12d3-a456-426614174001',
  })
  creditorId!: string;

  @ApiProperty({
    description: 'Amount owed in minor units',
    example: '1500',
  })
  amount_minor!: string;
}

export class BalancesResponseDto {
  @ApiProperty({
    description: 'Currency code',
    example: 'INR',
  })
  currency!: string;

  @ApiProperty({
    description: 'Pairwise balances',
    type: [BalancePairDto],
  })
  pairs!: BalancePairDto[];
}
