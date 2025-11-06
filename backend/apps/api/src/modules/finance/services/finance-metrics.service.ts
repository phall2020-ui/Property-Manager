import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';

@Injectable()
export class FinanceMetricsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Calculate arrears for a tenancy
   */
  async calculateTenancyArrears(tenancyId: string, landlordId: string): Promise<number> {
    // Get all invoices
    const invoices = await this.prisma.invoice.findMany({
      where: {
        tenancyId,
        landlordId,
        status: {
          in: ['ISSUED', 'PART_PAID'],
        },
      },
      include: {
        allocations: true,
      },
    });

    let arrears = 0;

    for (const invoice of invoices) {
      const paidAmount = invoice.allocations.reduce((sum, alloc) => sum + alloc.amount, 0);
      const balance = invoice.grandTotal - paidAmount;
      
      // Only count as arrears if past due date
      if (new Date() > invoice.dueDate && balance > 0) {
        arrears += balance;
      }
    }

    return arrears;
  }

  /**
   * Get arrears by aging buckets
   */
  async getArrearsAging(landlordId: string) {
    const today = new Date();
    const buckets = {
      '0-30': 0,
      '31-60': 0,
      '61-90': 0,
      '90+': 0,
    };

    const invoices = await this.prisma.invoice.findMany({
      where: {
        landlordId,
        status: {
          in: ['ISSUED', 'PART_PAID'],
        },
        dueDate: {
          lt: today,
        },
      },
      include: {
        allocations: true,
      },
    });

    for (const invoice of invoices) {
      const paidAmount = invoice.allocations.reduce((sum, alloc) => sum + alloc.amount, 0);
      const balance = invoice.grandTotal - paidAmount;

      if (balance <= 0) continue;

      const daysOverdue = Math.floor(
        (today.getTime() - invoice.dueDate.getTime()) / (1000 * 60 * 60 * 24),
      );

      if (daysOverdue <= 30) {
        buckets['0-30'] += balance;
      } else if (daysOverdue <= 60) {
        buckets['31-60'] += balance;
      } else if (daysOverdue <= 90) {
        buckets['61-90'] += balance;
      } else {
        buckets['90+'] += balance;
      }
    }

    return buckets;
  }

  /**
   * Get finance dashboard metrics
   */
  async getDashboardMetrics(landlordId: string) {
    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);

    // Rent received MTD
    const paymentsThisMonth = await this.prisma.payment.findMany({
      where: {
        landlordId,
        status: 'SUCCEEDED',
        receivedAt: {
          gte: startOfMonth,
          lte: endOfMonth,
        },
      },
    });

    const rentReceivedMTD = paymentsThisMonth.reduce((sum, p) => sum + p.amount, 0);

    // Outstanding invoices
    const outstandingInvoices = await this.prisma.invoice.findMany({
      where: {
        landlordId,
        status: {
          in: ['ISSUED', 'PART_PAID'],
        },
      },
      include: {
        allocations: true,
      },
    });

    let outstandingAmount = 0;
    let arrearsTotal = 0;

    for (const invoice of outstandingInvoices) {
      const paidAmount = invoice.allocations.reduce((sum, alloc) => sum + alloc.amount, 0);
      const balance = invoice.grandTotal - paidAmount;
      outstandingAmount += balance;

      if (new Date() > invoice.dueDate) {
        arrearsTotal += balance;
      }
    }

    // Active mandates percentage
    const totalTenancies = await this.prisma.tenancy.count({
      where: {
        property: {
          ownerOrgId: landlordId,
        },
        status: 'ACTIVE',
      },
    });

    const activeMandates = await this.prisma.mandate.count({
      where: {
        landlordId,
        status: 'ACTIVE',
      },
    });

    const mandateCoverage = totalTenancies > 0 ? (activeMandates / totalTenancies) * 100 : 0;

    // Next payouts (mock for now)
    const nextPayouts = await this.prisma.payout.findMany({
      where: {
        landlordId,
        paidAt: {
          gte: today,
        },
      },
      orderBy: {
        paidAt: 'asc',
      },
      take: 5,
    });

    return {
      rentReceivedMTD,
      outstandingInvoices: outstandingAmount,
      arrearsTotal,
      mandateCoverage: Math.round(mandateCoverage * 10) / 10,
      nextPayouts,
      invoiceCount: outstandingInvoices.length,
    };
  }

  /**
   * Get rent roll for a specific month
   */
  async getRentRoll(landlordId: string, month: string) {
    // Parse month (YYYY-MM format)
    const [year, monthNum] = month.split('-').map(Number);
    const startDate = new Date(year, monthNum - 1, 1);
    const endDate = new Date(year, monthNum, 0);

    // Get all active tenancies
    const tenancies = await this.prisma.tenancy.findMany({
      where: {
        property: {
          ownerOrgId: landlordId,
        },
        status: 'ACTIVE',
      },
      include: {
        property: true,
        tenantOrg: true,
      },
    });

    const rentRollItems = await Promise.all(
      tenancies.map(async (tenancy) => {
        // Expected rent (use rentAmount or rentPcm)
        const expectedRent = tenancy.rentAmount || tenancy.rentPcm;

        // Get payments received in this month
        const payments = await this.prisma.payment.findMany({
          where: {
            tenancyId: tenancy.id,
            status: 'SUCCEEDED',
            receivedAt: {
              gte: startDate,
              lte: endDate,
            },
          },
        });

        const receivedRent = payments.reduce((sum, p) => sum + p.amount, 0);
        const variance = receivedRent - expectedRent;

        // Check for active mandate for this tenancy
        // In a real system, we'd match tenants properly
        // For now, check if any mandate exists for this landlord with active status
        const mandate = await this.prisma.mandate.findFirst({
          where: {
            landlordId,
            status: 'ACTIVE',
          },
        });

        return {
          tenancyId: tenancy.id,
          propertyAddress: `${tenancy.property.addressLine1}, ${tenancy.property.postcode}`,
          tenantName: tenancy.tenantOrg.name,
          expectedRent,
          receivedRent,
          variance,
          hasMandate: !!mandate, // TODO: Link to specific tenancy tenants when User-Tenant relationship is established
        };
      }),
    );

    return rentRollItems;
  }

  /**
   * Get arrears list with details
   */
  async getArrearsList(landlordId: string, bucket?: string) {
    const today = new Date();

    // Get all tenancies with arrears
    const tenancies = await this.prisma.tenancy.findMany({
      where: {
        property: {
          ownerOrgId: landlordId,
        },
        status: 'ACTIVE',
      },
      include: {
        property: true,
        tenantOrg: true,
        tenants: true,
      },
    });

    const arrearsList = await Promise.all(
      tenancies.map(async (tenancy) => {
        const invoices = await this.prisma.invoice.findMany({
          where: {
            tenancyId: tenancy.id,
            landlordId,
            status: {
              in: ['ISSUED', 'PART_PAID'],
            },
            dueDate: {
              lt: today,
            },
          },
          include: {
            allocations: true,
          },
          orderBy: {
            dueDate: 'asc',
          },
        });

        let totalArrears = 0;
        let oldestInvoiceDueDate: Date | null = null;
        let daysBucket = '';

        for (const invoice of invoices) {
          const paidAmount = invoice.allocations.reduce((sum, alloc) => sum + alloc.amount, 0);
          const balance = invoice.grandTotal - paidAmount;

          if (balance > 0) {
            totalArrears += balance;
            if (!oldestInvoiceDueDate || invoice.dueDate < oldestInvoiceDueDate) {
              oldestInvoiceDueDate = invoice.dueDate;
            }
          }
        }

        if (totalArrears === 0) return null;

        // Calculate days overdue
        if (oldestInvoiceDueDate) {
          const daysOverdue = Math.floor(
            (today.getTime() - oldestInvoiceDueDate.getTime()) / (1000 * 60 * 60 * 24),
          );

          if (daysOverdue <= 30) daysBucket = '0-30';
          else if (daysOverdue <= 60) daysBucket = '31-60';
          else if (daysOverdue <= 90) daysBucket = '61-90';
          else daysBucket = '90+';
        }

        // Filter by bucket if specified
        if (bucket && daysBucket !== bucket) return null;

        const primaryTenant = tenancy.tenants[0];

        return {
          tenancyId: tenancy.id,
          propertyAddress: `${tenancy.property.addressLine1}, ${tenancy.property.postcode}`,
          tenantName: primaryTenant?.fullName || tenancy.tenantOrg.name,
          tenantEmail: primaryTenant?.email,
          tenantPhone: primaryTenant?.phone,
          arrearsAmount: totalArrears,
          oldestInvoiceDueDate,
          daysBucket,
        };
      }),
    );

    return arrearsList.filter((item) => item !== null);
  }

  /**
   * Get property rent summary with KPIs
   */
  async getPropertyRentSummary(propertyId: string, landlordId: string) {
    // Verify property ownership
    const property = await this.prisma.property.findFirst({
      where: { id: propertyId, ownerOrgId: landlordId },
    });

    if (!property) {
      throw new Error('Property not found');
    }

    // Get active tenancy
    const tenancy = await this.prisma.tenancy.findFirst({
      where: {
        propertyId,
        status: 'ACTIVE',
      },
      include: {
        tenantOrg: true,
      },
    });

    if (!tenancy) {
      return {
        nextDueAt: null,
        arrearsAmount: 0,
        collectedThisMonth: 0,
        expectedThisMonth: 0,
        collectionRate: 0,
        invoices: [],
        payments: [],
      };
    }

    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);

    // Get all invoices for this property
    const invoices = await this.prisma.invoice.findMany({
      where: {
        propertyId,
        landlordId,
      },
      include: {
        allocations: {
          include: {
            payment: true,
          },
        },
      },
      orderBy: {
        dueAt: 'desc',
      },
    });

    // Calculate arrears
    let arrearsAmount = 0;
    let nextDueAt: Date | null = null;
    let collectedThisMonth = 0;
    let expectedThisMonth = 0;

    for (const invoice of invoices) {
      const amount = invoice.amountGBP || invoice.grandTotal || invoice.amount || 0;
      const paidAmount = invoice.allocations.reduce((sum, alloc) => sum + alloc.amount, 0);
      const balance = amount - paidAmount;

      // Calculate arrears (overdue balance)
      if (invoice.dueAt < today && balance > 0) {
        arrearsAmount += balance;
      }

      // Find next due date
      if (invoice.status === 'DUE' && invoice.dueAt > today && (!nextDueAt || invoice.dueAt < nextDueAt)) {
        nextDueAt = invoice.dueAt;
      }

      // Calculate collection for current month
      if (invoice.dueAt >= startOfMonth && invoice.dueAt <= endOfMonth) {
        expectedThisMonth += amount;
        collectedThisMonth += paidAmount;
      }
    }

    const collectionRate = expectedThisMonth > 0 ? (collectedThisMonth / expectedThisMonth) * 100 : 0;

    // Get recent payments
    const payments = await this.prisma.payment.findMany({
      where: {
        propertyId,
        landlordId,
      },
      orderBy: {
        paidAt: 'desc',
      },
      take: 10,
      include: {
        invoice: true,
      },
    });

    return {
      nextDueAt,
      arrearsAmount,
      collectedThisMonth,
      expectedThisMonth,
      collectionRate: Math.round(collectionRate * 100) / 100,
      invoices: invoices.map((inv) => {
        const amount = inv.amountGBP || inv.grandTotal || inv.amount || 0;
        const paidAmount = inv.allocations.reduce((sum, alloc) => sum + alloc.amount, 0);
        return {
          id: inv.id,
          reference: inv.reference,
          periodStart: inv.periodStart,
          periodEnd: inv.periodEnd,
          dueAt: inv.dueAt,
          amount,
          paidAmount,
          balance: amount - paidAmount,
          status: inv.status,
        };
      }),
      payments: payments.map((pay) => ({
        id: pay.id,
        amount: pay.amountGBP || pay.amount || 0,
        paidAt: pay.paidAt,
        method: pay.method,
        invoiceReference: pay.invoice?.reference,
      })),
    };
  }

  /**
   * Export rent roll as CSV
   */
  async exportRentRollCSV(landlordId: string, month: string) {
    const rentRoll = await this.getRentRoll(landlordId, month);
    
    // CSV header
    let csv = 'Property,Tenancy,Period,Expected Rent,Received Rent,Variance,Has Mandate\n';

    for (const item of rentRoll) {
      const row = [
        this.escapeCSV(item.propertyAddress || ''),
        this.escapeCSV(item.tenantName || ''),
        `${month}`,
        item.expectedRent?.toFixed(2) || '0.00',
        item.receivedRent?.toFixed(2) || '0.00',
        item.variance?.toFixed(2) || '0.00',
        item.hasMandate ? 'Yes' : 'No',
      ].join(',');
      csv += row + '\n';
    }

    return {
      filename: `rent-roll-${month}.csv`,
      content: csv,
      contentType: 'text/csv',
    };
  }

  /**
   * Export payments ledger as CSV
   */
  async exportPaymentsCSV(landlordId: string, from?: string, to?: string) {
    const fromDate = from ? new Date(from) : new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    const toDate = to ? new Date(to) : new Date();

    const payments = await this.prisma.payment.findMany({
      where: {
        landlordId,
        paidAt: {
          gte: fromDate,
          lte: toDate,
        },
      },
      include: {
        invoice: {
          include: {
            tenancy: {
              include: {
                property: true,
                tenantOrg: true,
              },
            },
          },
        },
      },
      orderBy: {
        paidAt: 'desc',
      },
    });

    // CSV header
    let csv = 'Date,Property,Tenant,Invoice Reference,Amount,Method,Provider,Status\n';

    for (const payment of payments) {
      const row = [
        payment.paidAt.toLocaleDateString('en-GB'),
        this.escapeCSV(payment.invoice?.tenancy?.property?.addressLine1 || ''),
        this.escapeCSV(payment.invoice?.tenancy?.tenantOrg?.name || ''),
        this.escapeCSV(payment.invoice?.reference || ''),
        (payment.amountGBP || payment.amount || 0).toFixed(2),
        payment.method || '',
        payment.provider || '',
        payment.status || '',
      ].join(',');
      csv += row + '\n';
    }

    const fromStr = fromDate.toISOString().split('T')[0];
    const toStr = toDate.toISOString().split('T')[0];

    return {
      filename: `payments-${fromStr}-to-${toStr}.csv`,
      content: csv,
      contentType: 'text/csv',
    };
  }

  /**
   * Escape CSV field
   */
  private escapeCSV(value: string): string {
    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  }
}
