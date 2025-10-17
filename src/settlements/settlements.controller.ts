import { Controller, Post, Body, Param, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { SettlementsService } from './settlements.service';
import { UpiIntentDto, ConfirmSettlementDto, UpiIntentResponseDto, SettlementResponseDto } from './dto';
import { JwtGuard } from '../users/jwt.guard';
import { AppLogger } from '../common/app-logger.service';

@ApiTags('settlements')
@Controller('groups/:id/settlements')
@UseGuards(JwtGuard)
@ApiBearerAuth('JWT-auth')
export class SettlementsController {
  constructor(
    private readonly settlementsService: SettlementsService,
    private readonly logger: AppLogger,
  ) {}

  @Post('upi-intent')
  @ApiOperation({
    summary: 'Generate UPI payment intent',
    description: 'Generates a UPI deep link for payment settlement between group members',
  })
  @ApiParam({
    name: 'id',
    description: 'Group ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 201,
    description: 'UPI intent generated successfully',
    type: UpiIntentResponseDto,
  })
  async upiIntent(
    @Param('id') groupId: string,
    @Body() dto: UpiIntentDto,
    @Request() req: any,
  ): Promise<UpiIntentResponseDto> {
    this.logger.logAuthEvent('UPI intent generation initiated', req.user.id, {
      groupId,
      payerId: dto.payer_id,
      payeeId: dto.payee_id,
      amount: dto.amount_minor,
    });

    try {
      const result = await this.settlementsService.upiIntent(groupId, dto);
      
      this.logger.logAuthEvent('UPI intent generated successfully', req.user.id, {
        groupId,
        clientTxnRef: result.clientTxnRef,
        amount: dto.amount_minor,
      });

      return result;
    } catch (error) {
      this.logger.logAuthEvent('UPI intent generation failed', req.user.id, {
        error: error.message,
        groupId,
        payerId: dto.payer_id,
        payeeId: dto.payee_id,
      });
      throw error;
    }
  }

  @Post('confirm')
  @ApiOperation({
    summary: 'Confirm settlement transaction',
    description: 'Confirms a settlement transaction after UPI payment completion',
  })
  @ApiParam({
    name: 'id',
    description: 'Group ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 201,
    description: 'Settlement confirmed successfully',
    type: SettlementResponseDto,
  })
  async confirm(
    @Param('id') groupId: string,
    @Body() dto: ConfirmSettlementDto,
    @Request() req: any,
  ): Promise<SettlementResponseDto> {
    this.logger.logAuthEvent('Settlement confirmation initiated', req.user.id, {
      groupId,
      clientTxnRef: dto.client_txn_ref,
      payerId: dto.payer_id,
      payeeId: dto.payee_id,
      status: dto.status,
    });

    try {
      const result = await this.settlementsService.confirm(groupId, dto);
      
      this.logger.logAuthEvent('Settlement confirmed successfully', req.user.id, {
        groupId,
        settlementId: result.id,
        clientTxnRef: result.client_txn_ref,
        status: result.status,
      });

      return result;
    } catch (error) {
      this.logger.logAuthEvent('Settlement confirmation failed', req.user.id, {
        error: error.message,
        groupId,
        clientTxnRef: dto.client_txn_ref,
      });
      throw error;
    }
  }
}
