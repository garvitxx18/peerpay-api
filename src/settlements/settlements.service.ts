import { Injectable, BadRequestException, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { UpiIntentDto, ConfirmSettlementDto, UpiIntentResponseDto, SettlementResponseDto } from './dto';
import { nanoid } from 'nanoid';

@Injectable()
export class SettlementsService {
  constructor(private prisma: PrismaService) {}

  async upiIntent(groupId: string, dto: UpiIntentDto): Promise<UpiIntentResponseDto> {
    // Verify both users are members of the group
    const members = await this.prisma.group_member.findMany({
      where: {
        group_id: groupId,
        user_id: { in: [dto.payer_id, dto.payee_id] },
      },
      include: {
        user: {
          select: {
            id: true,
            display_name: true,
            upi_vpa: true,
          },
        },
      },
    });

    if (members.length !== 2) {
      throw new BadRequestException('Both payer and payee must be members of the group');
    }

    const payerMember = members.find(m => m.user_id === dto.payer_id);
    const payeeMember = members.find(m => m.user_id === dto.payee_id);

    if (!payerMember || !payeeMember) {
      throw new BadRequestException('Payer or payee not found in group');
    }

    // Resolve payee VPA
    let payeeVpa = dto.payee_vpa;
    if (!payeeVpa) {
      payeeVpa = payeeMember.upi_vpa || payeeMember.user.upi_vpa || undefined;
    }
    if (!payeeVpa) {
      throw new BadRequestException('Payee UPI VPA not found');
    }

    // Resolve payee name
    const payeeName = payeeMember.user.display_name || 
      (payeeMember.user.upi_vpa ? payeeMember.user.upi_vpa.split('@')[0] : 'Unknown');

    // Generate client transaction reference
    const clientTxnRef = `pp-${nanoid(16)}`;

    // Convert amount to rupees (divide by 100)
    const amountRupees = (dto.amount_minor / 100).toFixed(2);

    // Build UPI deep link
    const params = new URLSearchParams({
      pa: payeeVpa,
      pn: payeeName,
      am: amountRupees,
      cu: 'INR',
      tr: clientTxnRef,
    });

    if (dto.note) {
      params.set('tn', dto.note);
    }

    const upiUri = `upi://pay?${params.toString()}`;

    return {
      upiUri,
      clientTxnRef,
    };
  }

  async confirm(groupId: string, dto: ConfirmSettlementDto): Promise<SettlementResponseDto> {
    // Check if settlement already exists
    const existingSettlement = await this.prisma.settlement.findUnique({
      where: { client_txn_ref: dto.client_txn_ref },
    });

    if (existingSettlement) {
      throw new ConflictException('Settlement with this transaction reference already exists');
    }

    // Verify both users are members of the group
    const members = await this.prisma.group_member.findMany({
      where: {
        group_id: groupId,
        user_id: { in: [dto.payer_id, dto.payee_id] },
      },
    });

    if (members.length !== 2) {
      throw new BadRequestException('Both payer and payee must be members of the group');
    }

    // Create settlement
    const settlement = await this.prisma.settlement.create({
      data: {
        group_id: groupId,
        payer_id: dto.payer_id,
        payee_id: dto.payee_id,
        amount_minor: BigInt(dto.amount_minor),
        currency: 'INR',
        client_txn_ref: dto.client_txn_ref,
        upi_txn_id: dto.upi_txn_id,
        approval_ref_no: dto.approval_ref_no,
        status: dto.status || 'SUCCESS',
        note: dto.note,
      },
    });

    return {
      id: settlement.id,
      group_id: settlement.group_id,
      payer_id: settlement.payer_id,
      payee_id: settlement.payee_id,
      amount_minor: settlement.amount_minor.toString(),
      currency: settlement.currency,
      client_txn_ref: settlement.client_txn_ref,
      upi_txn_id: settlement.upi_txn_id || undefined,
      approval_ref_no: settlement.approval_ref_no || undefined,
      status: settlement.status,
      note: settlement.note || undefined,
      created_at: settlement.created_at.toISOString(),
    };
  }
}
