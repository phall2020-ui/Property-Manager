import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';

@Injectable()
export class ReconciliationService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Suggest matches for bank transaction
   */
  async suggestMatches(bankTransactionId: string, landlordId: string) {
    const bankTx = await this.prisma.bankTransaction.findFirst({
      where: {
        id: bankTransactionId,
        landlordId,
      },
    });

    if (!bankTx) {
      return [];
    }

    // Find potential matches
    const candidates = await this.findMatchCandidates(bankTx, landlordId);

    return candidates.map((candidate) => ({
      ...candidate,
      confidence: this.calculateConfidence(bankTx, candidate),
    }));
  }

  /**
   * Find candidate invoices/payments for matching
   */
  private async findMatchCandidates(bankTx: any, landlordId: string) {
    const dateWindow = 3; // days
    const amountTolerance = 1.0; // £1

    const startDate = new Date(bankTx.postedAt);
    startDate.setDate(startDate.getDate() - dateWindow);
    const endDate = new Date(bankTx.postedAt);
    endDate.setDate(endDate.getDate() + dateWindow);

    // For credits (money in), match against invoices
    if (bankTx.amount > 0) {
      const invoices = await this.prisma.invoice.findMany({
        where: {
          landlordId,
          status: {
            in: ['ISSUED', 'PART_PAID'],
          },
          dueDate: {
            gte: startDate,
            lte: endDate,
          },
          grandTotal: {
            gte: bankTx.amount - amountTolerance,
            lte: bankTx.amount + amountTolerance,
          },
        },
        include: {
          allocations: true,
        },
        take: 5,
      });

      return invoices.map((inv) => {
        const paidAmount = inv.allocations.reduce((sum, alloc) => sum + alloc.amount, 0);
        return {
          type: 'invoice',
          id: inv.id,
          number: inv.number,
          amount: inv.grandTotal,
          balance: inv.grandTotal - paidAmount,
          date: inv.dueDate,
        };
      });
    }

    return [];
  }

  /**
   * Calculate confidence score for a match
   */
  private calculateConfidence(bankTx: any, candidate: any): number {
    let score = 0;

    // Amount match (max 60 points)
    const amountDiff = Math.abs(bankTx.amount - candidate.amount);
    if (amountDiff === 0) score += 60;
    else if (amountDiff <= 1) score += 50;
    else if (amountDiff <= 5) score += 30;

    // Date proximity (max 20 points)
    const daysDiff = Math.abs(
      (new Date(bankTx.postedAt).getTime() - new Date(candidate.date).getTime()) /
        (1000 * 60 * 60 * 24),
    );
    if (daysDiff === 0) score += 20;
    else if (daysDiff <= 1) score += 15;
    else if (daysDiff <= 3) score += 10;

    // Description match (max 20 points) - fuzzy matching
    if (candidate.number && bankTx.description.includes(candidate.number)) {
      score += 20;
    }

    return Math.min(score, 100);
  }

  /**
   * Create a reconciliation match
   */
  async createMatch(
    bankTransactionId: string,
    landlordId: string,
    matchType: 'AUTO' | 'MANUAL',
    entityType: 'payment' | 'invoice',
    entityId: string,
    confidence: number,
  ) {
    return this.prisma.reconciliation.create({
      data: {
        landlordId,
        bankTransactionId,
        matchType,
        confidence,
        matchedEntityType: entityType,
        matchedEntityId: entityId,
      },
    });
  }

  /**
   * List unmatched bank transactions
   */
  async listUnmatchedTransactions(landlordId: string, page = 1, limit = 50) {
    const [transactions, total] = await Promise.all([
      this.prisma.bankTransaction.findMany({
        where: {
          landlordId,
          reconciliations: {
            none: {},
          },
        },
        orderBy: {
          postedAt: 'desc',
        },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.bankTransaction.count({
        where: {
          landlordId,
          reconciliations: {
            none: {},
          },
        },
      }),
    ]);

    return {
      data: transactions,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }
}
