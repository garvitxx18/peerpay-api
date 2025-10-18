import { IsOptional, IsEnum, IsNumber, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

// Query DTOs
export class UserExpensesQueryDto {
  @ApiProperty({
    description: 'Filter expenses by settlement status',
    example: 'unpaid',
    enum: ['paid', 'unpaid', 'all'],
    required: false,
    default: 'all',
  })
  @IsOptional()
  @IsEnum(['paid', 'unpaid', 'all'])
  status?: 'paid' | 'unpaid' | 'all' = 'all';

  @ApiProperty({
    description: 'Page number for pagination (starts from 1)',
    example: 1,
    minimum: 1,
    required: false,
    default: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiProperty({
    description: 'Number of items per page (maximum 100)',
    example: 20,
    minimum: 1,
    maximum: 100,
    required: false,
    default: 20,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  size?: number = 20;
}

// Response DTOs
export class UserGroupSummaryDto {
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
    description: 'Group currency code (ISO 4217)',
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
    description: 'User role in the group',
    example: 'admin',
    enum: ['admin', 'member'],
  })
  role!: string;

  @ApiProperty({
    description: 'Net amount user owes in this group (negative means user is owed money). Amount in minor units.',
    example: '-1500',
  })
  net_amount_minor!: string;

  @ApiProperty({
    description: 'Total amount user owes others in this group. Amount in minor units.',
    example: '3000',
  })
  total_owed_minor!: string;

  @ApiProperty({
    description: 'Total amount others owe user in this group. Amount in minor units.',
    example: '1500',
  })
  total_due_minor!: string;
}

export class UserGroupsResponseDto {
  @ApiProperty({
    description: 'List of groups user belongs to',
    type: [UserGroupSummaryDto],
  })
  groups!: UserGroupSummaryDto[];
}

export class UserExpenseDto {
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
    description: 'Total expense amount in minor units',
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
    description: 'Group information',
    example: {
      id: 'group-123',
      name: 'Trip to Goa',
      currency: 'INR',
    },
  })
  group!: {
    id: string;
    name: string;
    currency: string;
  };

  @ApiProperty({
    description: 'Payer information',
    example: {
      id: 'user-123',
      display_name: 'John Doe',
    },
  })
  payer!: {
    id: string;
    display_name: string;
  };

  @ApiProperty({
    description: 'User share amount in minor units',
    example: '1500',
  })
  user_share_minor!: string;

  @ApiProperty({
    description: 'Whether user paid this expense',
    example: true,
  })
  is_payer!: boolean;

  @ApiProperty({
    description: 'Whether user has settled their share',
    example: false,
  })
  is_settled!: boolean;

  @ApiProperty({
    description: 'Additional note',
    example: 'Great food!',
    required: false,
  })
  note?: string;
}

export class UserExpensesResponseDto {
  @ApiProperty({
    description: 'List of user expenses',
    type: [UserExpenseDto],
  })
  items!: UserExpenseDto[];

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

export class UserSummaryDto {
  @ApiProperty({
    description: 'Total amount user owes across all groups. Amount in minor units.',
    example: '5000',
  })
  total_owed_minor!: string;

  @ApiProperty({
    description: 'Total amount others owe user across all groups. Amount in minor units.',
    example: '3000',
  })
  total_due_minor!: string;

  @ApiProperty({
    description: 'Net amount (owed - due, negative means user is owed money). Amount in minor units.',
    example: '2000',
  })
  net_amount_minor!: string;

  @ApiProperty({
    description: 'Currency code for all amounts',
    example: 'INR',
  })
  currency!: string;

  @ApiProperty({
    description: 'Number of groups user belongs to',
    example: 3,
  })
  group_count!: number;

  @ApiProperty({
    description: 'Number of unsettled expenses user is involved in',
    example: 5,
  })
  unsettled_expense_count!: number;
}

export class UserDueDto {
  @ApiProperty({
    description: 'Group ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  group_id!: string;

  @ApiProperty({
    description: 'Group name',
    example: 'Trip to Goa',
  })
  group_name!: string;

  @ApiProperty({
    description: 'Group currency',
    example: 'INR',
  })
  currency!: string;

  @ApiProperty({
    description: 'People user owes money to',
    example: [
      {
        user_id: 'user-123',
        display_name: 'John Doe',
        amount_minor: '1500',
      },
    ],
  })
  owes_to!: Array<{
    user_id: string;
    display_name: string;
    amount_minor: string;
  }>;

  @ApiProperty({
    description: 'People who owe money to user',
    example: [
      {
        user_id: 'user-456',
        display_name: 'Jane Smith',
        amount_minor: '2000',
      },
    ],
  })
  owed_by!: Array<{
    user_id: string;
    display_name: string;
    amount_minor: string;
  }>;

  @ApiProperty({
    description: 'Net amount user owes in this group',
    example: '500',
  })
  net_amount_minor!: string;
}

export class UserDuesResponseDto {
  @ApiProperty({
    description: 'Per-group breakdown of dues',
    type: [UserDueDto],
  })
  groups!: UserDueDto[];
}
