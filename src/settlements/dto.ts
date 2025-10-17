import { IsString, IsOptional, IsEnum, IsNumber, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpiIntentDto {
  @ApiProperty({
    description: 'User ID who will pay',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  payer_id!: string;

  @ApiProperty({
    description: 'User ID who will receive payment',
    example: '123e4567-e89b-12d3-a456-426614174001',
  })
  @IsUUID()
  payee_id!: string;

  @ApiProperty({
    description: 'Amount in minor units',
    example: 1500,
  })
  @IsNumber()
  amount_minor!: number;

  @ApiProperty({
    description: 'Payment note',
    example: 'Settlement for dinner',
    required: false,
  })
  @IsOptional()
  @IsString()
  note?: string;

  @ApiProperty({
    description: 'Payee UPI VPA',
    example: 'payee@paytm',
    required: false,
  })
  @IsOptional()
  @IsString()
  payee_vpa?: string;

  @ApiProperty({
    description: 'Payer UPI VPA',
    example: 'payer@paytm',
    required: false,
  })
  @IsOptional()
  @IsString()
  payer_vpa?: string;
}

export class ConfirmSettlementDto {
  @ApiProperty({
    description: 'Client transaction reference',
    example: 'pp-abc123def456ghi7',
  })
  @IsString()
  client_txn_ref!: string;

  @ApiProperty({
    description: 'User ID who paid',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  payer_id!: string;

  @ApiProperty({
    description: 'User ID who received payment',
    example: '123e4567-e89b-12d3-a456-426614174001',
  })
  @IsUUID()
  payee_id!: string;

  @ApiProperty({
    description: 'Amount in minor units',
    example: 1500,
  })
  @IsNumber()
  amount_minor!: number;

  @ApiProperty({
    description: 'Transaction status',
    example: 'SUCCESS',
    required: false,
  })
  @IsOptional()
  @IsEnum(['SUCCESS', 'FAILURE', 'SUBMITTED', 'UNKNOWN'])
  status?: 'SUCCESS' | 'FAILURE' | 'SUBMITTED' | 'UNKNOWN';

  @ApiProperty({
    description: 'UPI transaction ID',
    example: 'TXN123456789',
    required: false,
  })
  @IsOptional()
  @IsString()
  upi_txn_id?: string;

  @ApiProperty({
    description: 'Approval reference number',
    example: 'APR123456789',
    required: false,
  })
  @IsOptional()
  @IsString()
  approval_ref_no?: string;

  @ApiProperty({
    description: 'Transaction note',
    example: 'Settlement for dinner',
    required: false,
  })
  @IsOptional()
  @IsString()
  note?: string;
}

export class UpiIntentResponseDto {
  @ApiProperty({
    description: 'UPI deep link URI',
    example: 'upi://pay?pa=payee@paytm&pn=John%20Doe&am=15.00&cu=INR&tn=Settlement%20for%20dinner&tr=pp-abc123def456ghi7',
  })
  upiUri!: string;

  @ApiProperty({
    description: 'Client transaction reference',
    example: 'pp-abc123def456ghi7',
  })
  clientTxnRef!: string;
}

export class SettlementResponseDto {
  @ApiProperty({
    description: 'Settlement ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id!: string;

  @ApiProperty({
    description: 'Group ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  group_id!: string;

  @ApiProperty({
    description: 'Payer user ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  payer_id!: string;

  @ApiProperty({
    description: 'Payee user ID',
    example: '123e4567-e89b-12d3-a456-426614174001',
  })
  payee_id!: string;

  @ApiProperty({
    description: 'Amount in minor units',
    example: '1500',
  })
  amount_minor!: string;

  @ApiProperty({
    description: 'Currency code',
    example: 'INR',
  })
  currency!: string;

  @ApiProperty({
    description: 'Client transaction reference',
    example: 'pp-abc123def456ghi7',
  })
  client_txn_ref!: string;

  @ApiProperty({
    description: 'UPI transaction ID',
    example: 'TXN123456789',
    required: false,
  })
  upi_txn_id?: string;

  @ApiProperty({
    description: 'Approval reference number',
    example: 'APR123456789',
    required: false,
  })
  approval_ref_no?: string;

  @ApiProperty({
    description: 'Transaction status',
    example: 'SUCCESS',
  })
  status!: string;

  @ApiProperty({
    description: 'Transaction note',
    example: 'Settlement for dinner',
    required: false,
  })
  note?: string;

  @ApiProperty({
    description: 'Creation timestamp',
    example: '2024-01-15T19:30:00Z',
  })
  created_at!: string;
}
