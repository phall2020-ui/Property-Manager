import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class FinanceService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get or create finance settings for landlord
   */
  async getFinanceSettings(landlordId: string) {
    let settings = await this.prisma.financeSettings.findUnique({
      where: { landlordId },
    });

    if (!settings) {
      settings = await this.prisma.financeSettings.create({
        data: {
          landlordId,
        },
      });
    }

    return settings;
  }

  /**
   * Update finance settings
   */
  async updateFinanceSettings(landlordId: string, data: any) {
    return this.prisma.financeSettings.upsert({
      where: { landlordId },
      update: data,
      create: {
        landlordId,
        ...data,
      },
    });
  }

  /**
   * Get tenancy balance
   */
  async getTenancyBalance(tenancyId: string, landlordId: string) {
    // Get all invoices
    const invoices = await this.prisma.invoice.findMany({
      where: {
        tenancyId,
        landlordId,
        status: {
          not: 'VOID',
        },
      },
      include: {
        allocations: true,
      },
    });

    let totalBilled = 0;
    let totalPaid = 0;
    let openBalance = 0;

    for (const invoice of invoices) {
      totalBilled += invoice.grandTotal;
      const paid = invoice.allocations.reduce((sum, alloc) => sum + alloc.amount, 0);
      totalPaid += paid;
      openBalance += invoice.grandTotal - paid;
    }

    // Get last payment
    const lastPayment = await this.prisma.payment.findFirst({
      where: {
        tenancyId,
        landlordId,
        status: 'SUCCEEDED',
      },
      orderBy: {
        receivedAt: 'desc',
      },
    });

    // Calculate arrears
    const today = new Date();
    const arrearsInvoices = invoices.filter(
      (inv) => inv.status !== 'PAID' && new Date(inv.dueDate) < today,
    );
    
    let arrearsAmount = 0;
    for (const invoice of arrearsInvoices) {
      const paid = invoice.allocations.reduce((sum, alloc) => sum + alloc.amount, 0);
      arrearsAmount += invoice.grandTotal - paid;
    }

    return {
      totalBilled,
      totalPaid,
      openBalance,
      arrearsAmount,
      lastPayment: lastPayment
        ? {
            amount: lastPayment.amount,
            date: lastPayment.receivedAt,
            method: lastPayment.method,
          }
        : null,
    };
  }
}
