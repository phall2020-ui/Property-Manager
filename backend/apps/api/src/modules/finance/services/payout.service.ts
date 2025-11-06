import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';

@Injectable()
export class PayoutService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a payout (mock for now)
   */
  async createPayout(
    landlordId: string,
    data: {
      amount: number;
      bankAccountLast4?: string;
      provider?: string;
    },
  ) {
    return this.prisma.payout.create({
      data: {
        landlordId,
        amount: data.amount,
        bankAccountLast4: data.bankAccountLast4 || '****',
        provider: data.provider || 'MANUAL',
        paidAt: new Date(),
        reference: `PAYOUT-${Date.now()}`,
      },
    });
  }

  /**
   * List payouts
   */
  async listPayouts(landlordId: string, page = 1, limit = 50) {
    const [payouts, total] = await Promise.all([
      this.prisma.payout.findMany({
        where: { landlordId },
        orderBy: {
          paidAt: 'desc',
        },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.payout.count({ where: { landlordId } }),
    ]);

    return {
      data: payouts,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get payout by ID
   */
  async getPayout(payoutId: string, landlordId: string) {
    return this.prisma.payout.findFirst({
      where: {
        id: payoutId,
        landlordId,
      },
    });
  }
}
