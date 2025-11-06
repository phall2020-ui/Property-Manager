import {
  Controller,
  Get,
  Param,
  Query,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { InvoiceService } from './services/invoice.service';
import { PaymentService } from './services/payment.service';
import { PrismaService } from '../../common/prisma/prisma.service';

@ApiTags('tenant-payments')
@Controller('tenant/payments')
export class TenantFinanceController {
  constructor(
    private readonly invoiceService: InvoiceService,
    private readonly paymentService: PaymentService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Get tenant organization ID from user
   */
  private getTenantOrgId(user: any): string {
    const tenantOrg = user.orgs?.find((o: any) => o.role === 'TENANT');
    if (!tenantOrg) {
      throw new BadRequestException('User is not a tenant');
    }
    return tenantOrg.orgId;
  }

  // ========== Tenant Invoice Views ==========

  @Roles('TENANT')
  @Get('invoices')
  @ApiOperation({ summary: 'List invoices for tenant (their tenancy only)' })
  @ApiBearerAuth()
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async listTenantInvoices(
    @Query('status') status: string,
    @Query('page') page: string,
    @Query('limit') limit: string,
    @CurrentUser() user: any,
  ) {
    const tenantOrgId = this.getTenantOrgId(user);

    // Find tenancies for this tenant
    const tenancies = await this.prisma.tenancy.findMany({
      where: { tenantOrgId },
      select: { id: true },
    });

    const tenancyIds = tenancies.map((t) => t.id);

    if (tenancyIds.length === 0) {
      return {
        data: [],
        total: 0,
        page: 1,
        limit: 50,
        totalPages: 0,
      };
    }

    // Get invoices for these tenancies
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 50;

    const where: any = {
      tenancyId: { in: tenancyIds },
    };
    if (status) where.status = status;

    const [invoices, total] = await Promise.all([
      this.prisma.invoice.findMany({
        where,
        include: {
          allocations: true,
          tenancy: {
            include: {
              property: true,
            },
          },
        },
        orderBy: {
          dueAt: 'desc',
        },
        skip: (pageNum - 1) * limitNum,
        take: limitNum,
      }),
      this.prisma.invoice.count({ where }),
    ]);

    // Calculate balances
    const invoicesWithBalance = invoices.map((invoice) => {
      const paidAmount = invoice.allocations.reduce((sum, alloc) => sum + alloc.amount, 0);
      const amount = invoice.amountGBP || invoice.grandTotal || invoice.amount || 0;
      return {
        ...invoice,
        paidAmount,
        balance: amount - paidAmount,
      };
    });

    return {
      data: invoicesWithBalance,
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum),
    };
  }

  @Roles('TENANT')
  @Get('invoices/:id')
  @ApiOperation({ summary: 'Get invoice detail for tenant' })
  @ApiBearerAuth()
  async getTenantInvoice(@Param('id') id: string, @CurrentUser() user: any) {
    const tenantOrgId = this.getTenantOrgId(user);

    // Get invoice with tenancy check
    const invoice = await this.prisma.invoice.findFirst({
      where: {
        id,
        tenancy: {
          tenantOrgId,
        },
      },
      include: {
        allocations: {
          include: {
            payment: true,
          },
        },
        tenancy: {
          include: {
            property: true,
          },
        },
      },
    });

    if (!invoice) {
      throw new BadRequestException('Invoice not found');
    }

    const paidAmount = invoice.allocations.reduce((sum, alloc) => sum + alloc.amount, 0);
    const amount = invoice.amountGBP || invoice.grandTotal || invoice.amount || 0;

    return {
      ...invoice,
      paidAmount,
      balance: amount - paidAmount,
    };
  }

  @Roles('TENANT')
  @Get('receipts/:id')
  @ApiOperation({ summary: 'Get payment receipt (simple HTML)' })
  @ApiBearerAuth()
  async getReceipt(@Param('id') id: string, @CurrentUser() user: any) {
    const tenantOrgId = this.getTenantOrgId(user);

    // Get invoice with verification
    const invoice = await this.prisma.invoice.findFirst({
      where: {
        id,
        tenancy: {
          tenantOrgId,
        },
      },
      include: {
        allocations: {
          include: {
            payment: true,
          },
        },
        tenancy: {
          include: {
            property: true,
          },
        },
      },
    });

    if (!invoice) {
      throw new BadRequestException('Invoice not found');
    }

    // Simple receipt data (HTML generation in frontend or future PDF service)
    const paidAmount = invoice.allocations.reduce((sum, alloc) => sum + alloc.amount, 0);
    const amount = invoice.amountGBP || invoice.grandTotal || invoice.amount || 0;

    return {
      invoice: {
        id: invoice.id,
        number: invoice.number,
        reference: invoice.reference,
        periodStart: invoice.periodStart,
        periodEnd: invoice.periodEnd,
        dueAt: invoice.dueAt,
        amount,
        status: invoice.status,
      },
      property: {
        address: `${invoice.tenancy.property.addressLine1}, ${invoice.tenancy.property.city}, ${invoice.tenancy.property.postcode}`,
      },
      payments: invoice.allocations.map((alloc) => ({
        id: alloc.payment.id,
        amount: alloc.amount,
        paidAt: alloc.payment.paidAt,
        method: alloc.payment.method,
      })),
      paidAmount,
      balance: amount - paidAmount,
    };
  }
}
