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

        // Check for active mandate
        const mandate = await this.prisma.mandate.findFirst({
          where: {
            landlordId,
            status: 'ACTIVE',
          },
        });

        return {
          tenancyId: tenancy.id,
          propertyAddress: `${tenancy.property.address1}, ${tenancy.property.postcode}`,
          tenantName: tenancy.tenantOrg.name,
          expectedRent,
          receivedRent,
          variance,
          hasMandate: !!mandate,
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
          propertyAddress: `${tenancy.property.address1}, ${tenancy.property.postcode}`,
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
}
