import { Injectable, NotFoundException, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';

@Injectable()
export class ReconciliationService {
  private readonly logger = new Logger(ReconciliationService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Auto-match bank transactions with invoices
   */
  async autoReconcile(
    landlordId: string,
    startDate: Date,
    endDate: Date,
    bankAccountId?: string,
  ) {
    this.logger.log(
      `Auto-reconciling transactions for landlord ${landlordId} from ${startDate} to ${endDate}`,
    );

    // Get unmatched transactions
    const transactions = await this.prisma.bankTransaction.findMany({
      where: {
        landlordId,
        postedAt: {
          gte: startDate,
          lte: endDate,
        },
        ...(bankAccountId ? { bankAccountId } : {}),
        matchedInvoiceId: null,
      },
      orderBy: { postedAt: 'desc' },
    });

    this.logger.log(`Found ${transactions.length} unmatched transactions`);

    let matchedCount = 0;

    for (const tx of transactions) {
      const match = await this.findBestMatch(landlordId, tx);

      if (match) {
        // Create reconciliation record
        await this.prisma.reconciliation.create({
          data: {
            landlordId,
            bankTransactionId: tx.id,
            matchType: 'AUTO',
            confidence: match.confidence,
            matchedEntityType: 'invoice',
            matchedEntityId: match.invoiceId,
          },
        });

        // Update transaction with match info
        await this.prisma.bankTransaction.update({
          where: { id: tx.id },
          data: {
            matchedInvoiceId: match.invoiceId,
            confidence: match.confidence,
          },
        });

        // If confidence is high and amount matches exactly, mark invoice as PAID
        if (match.confidence >= 90 && match.amountMatches) {
          await this.prisma.invoice.update({
            where: { id: match.invoiceId },
            data: { status: 'PAID' },
          });
        }

        matchedCount++;
        this.logger.log(
          `Matched transaction ${tx.id} with invoice ${match.invoiceId} (confidence: ${match.confidence})`,
        );
      }
    }

    this.logger.log(`Auto-matched ${matchedCount} transactions`);
    return { matched: matchedCount, total: transactions.length };
  }

  /**
   * Manual match of transaction to invoice
   */
  async manualMatch(
    landlordId: string,
    bankTransactionId: string,
    invoiceId: string,
  ) {
    this.logger.log(
      `Manual match: transaction ${bankTransactionId} to invoice ${invoiceId}`,
    );

    // Verify transaction and invoice belong to landlord
    const transaction = await this.prisma.bankTransaction.findFirst({
      where: { id: bankTransactionId, landlordId },
    });

    if (!transaction) {
      throw new NotFoundException('Bank transaction not found');
    }

    const invoice = await this.prisma.invoice.findFirst({
      where: { id: invoiceId, landlordId },
    });

    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }

    // Check if already matched
    const existingMatch = await this.prisma.reconciliation.findFirst({
      where: { bankTransactionId, landlordId },
    });

    if (existingMatch) {
      throw new BadRequestException('Transaction already matched');
    }

    // Create reconciliation
    const reconciliation = await this.prisma.reconciliation.create({
      data: {
        landlordId,
        bankTransactionId,
        matchType: 'MANUAL',
        confidence: 100,
        matchedEntityType: 'invoice',
        matchedEntityId: invoiceId,
      },
    });

    // Update transaction
    await this.prisma.bankTransaction.update({
      where: { id: bankTransactionId },
      data: {
        matchedInvoiceId: invoiceId,
        confidence: 100,
      },
    });

    // If amounts match, mark invoice as PAID
    if (Math.abs(transaction.amount - invoice.grandTotal) < 0.01) {
      await this.prisma.invoice.update({
        where: { id: invoiceId },
        data: { status: 'PAID' },
      });
    }

    this.logger.log(`Manual match created: ${reconciliation.id}`);
    return reconciliation;
  }

  /**
   * Unmatch a transaction
   */
  async unmatch(landlordId: string, bankTransactionId: string) {
    this.logger.log(`Unmatching transaction ${bankTransactionId}`);

    const transaction = await this.prisma.bankTransaction.findFirst({
      where: { id: bankTransactionId, landlordId },
    });

    if (!transaction) {
      throw new NotFoundException('Bank transaction not found');
    }

    // Get reconciliation to find invoice
    const reconciliation = await this.prisma.reconciliation.findFirst({
      where: { bankTransactionId, landlordId },
    });

    // Delete reconciliation
    if (reconciliation) {
      await this.prisma.reconciliation.delete({
        where: { id: reconciliation.id },
      });

      // If invoice was marked PAID, revert to ISSUED
      if (reconciliation.matchedEntityType === 'invoice' && reconciliation.matchedEntityId) {
        const invoice = await this.prisma.invoice.findUnique({
          where: { id: reconciliation.matchedEntityId },
        });

        if (invoice && invoice.status === 'PAID') {
          await this.prisma.invoice.update({
            where: { id: invoice.id },
            data: { status: 'ISSUED' },
          });
        }
      }
    }

    // Clear match from transaction
    await this.prisma.bankTransaction.update({
      where: { id: bankTransactionId },
      data: {
        matchedInvoiceId: null,
        confidence: null,
      },
    });

    this.logger.log(`Transaction ${bankTransactionId} unmatched`);
    return { success: true };
  }

  /**
   * Find best matching invoice for a transaction
   */
  private async findBestMatch(
    landlordId: string,
    transaction: any,
  ): Promise<{ invoiceId: string; confidence: number; amountMatches: boolean } | null> {
    // Get unpaid/partially paid invoices around the transaction date
    const dateWindow = 3; // ±3 days
    const startDate = new Date(transaction.postedAt);
    startDate.setDate(startDate.getDate() - dateWindow);
    const endDate = new Date(transaction.postedAt);
    endDate.setDate(endDate.getDate() + dateWindow);

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
      },
    });

    if (invoices.length === 0) {
      return null;
    }

    let bestMatch: { invoiceId: string; confidence: number; amountMatches: boolean } | null = null;

    for (const invoice of invoices) {
      let confidence = 0;
      let amountMatches = false;

      // Check amount match (exact or very close)
      const amountDiff = Math.abs(transaction.amount - invoice.grandTotal);
      if (amountDiff < 0.01) {
        confidence += 50; // Exact amount match
        amountMatches = true;
      } else if (amountDiff / invoice.grandTotal < 0.01) {
        confidence += 40; // Within 1%
      } else if (amountDiff / invoice.grandTotal < 0.05) {
        confidence += 20; // Within 5%
      }

      // Check reference match
      if (transaction.reference) {
        const ref = transaction.reference.toLowerCase();
        const invoiceNumber = invoice.number.toLowerCase();

        if (ref.includes(invoiceNumber) || invoiceNumber.includes(ref)) {
          confidence += 40; // Reference contains invoice number
        } else if (ref.includes('inv') && ref.includes(invoice.number.slice(-4))) {
          confidence += 20; // Partial match
        }
      }

      // Check description match
      if (transaction.description) {
        const desc = transaction.description.toLowerCase();
        if (desc.includes('rent') || desc.includes('payment')) {
          confidence += 10;
        }
      }

      // Date proximity bonus (already within ±3 days)
      const daysDiff = Math.abs(
        (transaction.postedAt.getTime() - invoice.dueDate.getTime()) /
          (1000 * 60 * 60 * 24),
      );
      if (daysDiff <= 1) {
        confidence += 10;
      } else if (daysDiff <= 3) {
        confidence += 5;
      }

      // Update best match if this is better
      if (!bestMatch || confidence > bestMatch.confidence) {
        bestMatch = {
          invoiceId: invoice.id,
          confidence: Math.min(confidence, 100),
          amountMatches,
        };
      }
    }

    // Only return matches with confidence >= 70
    if (bestMatch && bestMatch.confidence >= 70) {
      return bestMatch;
    }

    return null;
  }
}
