import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Patch,
  Query,
  Headers,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { FinanceService } from './finance.service';
import { InvoiceService } from './services/invoice.service';
import { PaymentService } from './services/payment.service';
import { MandateService } from './services/mandate.service';
import { ReconciliationService } from './services/reconciliation.service';
import { PayoutService } from './services/payout.service';
import { FinanceMetricsService } from './services/finance-metrics.service';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { RecordPaymentDto } from './dto/record-payment.dto';
import { AllocatePaymentDto } from './dto/allocate-payment.dto';
import { CreateMandateDto } from './dto/create-mandate.dto';

@ApiTags('finance')
@Controller('finance')
export class FinanceController {
  constructor(
    private readonly financeService: FinanceService,
    private readonly invoiceService: InvoiceService,
    private readonly paymentService: PaymentService,
    private readonly mandateService: MandateService,
    private readonly reconciliationService: ReconciliationService,
    private readonly payoutService: PayoutService,
    private readonly metricsService: FinanceMetricsService,
  ) {}

  /**
   * Get landlord ID from user
   */
  private getLandlordId(user: any): string {
    const landlordOrg = user.orgs?.find((o: any) => o.role === 'LANDLORD');
    if (!landlordOrg) {
      throw new BadRequestException('User is not a landlord');
    }
    return landlordOrg.orgId;
  }

  // ========== Dashboard & Metrics ==========

  @Roles('LANDLORD')
  @Get('dashboard')
  @ApiOperation({ summary: 'Get finance dashboard KPIs' })
  @ApiBearerAuth()
  async getDashboard(@CurrentUser() user: any) {
    const landlordId = this.getLandlordId(user);
    return this.metricsService.getDashboardMetrics(landlordId);
  }

  @Roles('LANDLORD')
  @Get('rent-roll')
  @ApiOperation({ summary: 'Get rent roll for a month' })
  @ApiBearerAuth()
  @ApiQuery({ name: 'month', required: false, description: 'YYYY-MM format' })
  async getRentRoll(@Query('month') month: string, @CurrentUser() user: any) {
    const landlordId = this.getLandlordId(user);
    const targetMonth = month || new Date().toISOString().slice(0, 7);
    return this.metricsService.getRentRoll(landlordId, targetMonth);
  }

  @Roles('LANDLORD')
  @Get('arrears')
  @ApiOperation({ summary: 'Get arrears list with aging buckets' })
  @ApiBearerAuth()
  @ApiQuery({ name: 'bucket', required: false, enum: ['0-30', '31-60', '61-90', '90+'] })
  async getArrears(@Query('bucket') bucket: string, @CurrentUser() user: any) {
    const landlordId = this.getLandlordId(user);
    return this.metricsService.getArrearsList(landlordId, bucket);
  }

  @Roles('LANDLORD')
  @Get('arrears/aging')
  @ApiOperation({ summary: 'Get arrears aging buckets' })
  @ApiBearerAuth()
  async getArrearsAging(@CurrentUser() user: any) {
    const landlordId = this.getLandlordId(user);
    return this.metricsService.getArrearsAging(landlordId);
  }

  // ========== Invoices ==========

  @Roles('LANDLORD')
  @Post('invoices')
  @ApiOperation({ summary: 'Create a new invoice' })
  @ApiBearerAuth()
  async createInvoice(@Body() dto: CreateInvoiceDto, @CurrentUser() user: any) {
    const landlordId = this.getLandlordId(user);
    return this.invoiceService.createInvoice(landlordId, dto);
  }

  @Roles('LANDLORD')
  @Get('invoices')
  @ApiOperation({ summary: 'List invoices' })
  @ApiBearerAuth()
  @ApiQuery({ name: 'propertyId', required: false })
  @ApiQuery({ name: 'tenancyId', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async listInvoices(
    @Query('propertyId') propertyId: string,
    @Query('tenancyId') tenancyId: string,
    @Query('status') status: string,
    @Query('page') page: string,
    @Query('limit') limit: string,
    @CurrentUser() user: any,
  ) {
    const landlordId = this.getLandlordId(user);
    return this.invoiceService.listInvoices(landlordId, {
      propertyId,
      tenancyId,
      status,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 50,
    });
  }

  @Roles('LANDLORD')
  @Get('invoices/:id')
  @ApiOperation({ summary: 'Get invoice by ID' })
  @ApiBearerAuth()
  async getInvoice(@Param('id') id: string, @CurrentUser() user: any) {
    const landlordId = this.getLandlordId(user);
    return this.invoiceService.getInvoice(id, landlordId);
  }

  @Roles('LANDLORD')
  @Post('invoices/:id/void')
  @ApiOperation({ summary: 'Void an invoice' })
  @ApiBearerAuth()
  async voidInvoice(@Param('id') id: string, @CurrentUser() user: any) {
    const landlordId = this.getLandlordId(user);
    return this.invoiceService.voidInvoice(id, landlordId);
  }

  // ========== Payments ==========

  @Roles('LANDLORD')
  @Post('payments/record')
  @ApiOperation({ summary: 'Record a payment' })
  @ApiBearerAuth()
  async recordPayment(@Body() dto: RecordPaymentDto, @CurrentUser() user: any) {
    const landlordId = this.getLandlordId(user);
    return this.paymentService.recordPayment(landlordId, dto);
  }

  @Roles('LANDLORD')
  @Get('payments')
  @ApiOperation({ summary: 'List payments' })
  @ApiBearerAuth()
  @ApiQuery({ name: 'propertyId', required: false })
  @ApiQuery({ name: 'tenancyId', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async listPayments(
    @Query('propertyId') propertyId: string,
    @Query('tenancyId') tenancyId: string,
    @Query('status') status: string,
    @Query('page') page: string,
    @Query('limit') limit: string,
    @CurrentUser() user: any,
  ) {
    const landlordId = this.getLandlordId(user);
    return this.paymentService.listPayments(landlordId, {
      propertyId,
      tenancyId,
      status,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 50,
    });
  }

  @Roles('LANDLORD')
  @Get('payments/:id')
  @ApiOperation({ summary: 'Get payment by ID' })
  @ApiBearerAuth()
  async getPayment(@Param('id') id: string, @CurrentUser() user: any) {
    const landlordId = this.getLandlordId(user);
    return this.paymentService.getPayment(id, landlordId);
  }

  @Roles('LANDLORD')
  @Post('payments/:id/allocate')
  @ApiOperation({ summary: 'Manually allocate payment to invoices' })
  @ApiBearerAuth()
  async allocatePayment(
    @Param('id') id: string,
    @Body() dto: AllocatePaymentDto,
    @CurrentUser() user: any,
  ) {
    const landlordId = this.getLandlordId(user);
    return this.paymentService.allocatePayment(id, landlordId, dto.allocations);
  }

  // ========== Mandates ==========

  @Roles('LANDLORD')
  @Post('mandates')
  @ApiOperation({ summary: 'Create a mandate' })
  @ApiBearerAuth()
  async createMandate(@Body() dto: CreateMandateDto, @CurrentUser() user: any) {
    const landlordId = this.getLandlordId(user);
    return this.mandateService.createMandate(landlordId, dto);
  }

  @Roles('LANDLORD')
  @Get('mandates')
  @ApiOperation({ summary: 'List mandates' })
  @ApiBearerAuth()
  @ApiQuery({ name: 'tenantUserId', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async listMandates(
    @Query('tenantUserId') tenantUserId: string,
    @Query('status') status: string,
    @Query('page') page: string,
    @Query('limit') limit: string,
    @CurrentUser() user: any,
  ) {
    const landlordId = this.getLandlordId(user);
    return this.mandateService.listMandates(landlordId, {
      tenantUserId,
      status,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 50,
    });
  }

  @Roles('LANDLORD')
  @Get('mandates/:id')
  @ApiOperation({ summary: 'Get mandate by ID' })
  @ApiBearerAuth()
  async getMandate(@Param('id') id: string, @CurrentUser() user: any) {
    const landlordId = this.getLandlordId(user);
    return this.mandateService.getMandate(id, landlordId);
  }

  // ========== Payouts ==========

  @Roles('LANDLORD')
  @Get('payouts')
  @ApiOperation({ summary: 'List payouts' })
  @ApiBearerAuth()
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async listPayouts(
    @Query('page') page: string,
    @Query('limit') limit: string,
    @CurrentUser() user: any,
  ) {
    const landlordId = this.getLandlordId(user);
    return this.payoutService.listPayouts(
      landlordId,
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 50,
    );
  }

  @Roles('LANDLORD')
  @Get('payouts/:id')
  @ApiOperation({ summary: 'Get payout by ID' })
  @ApiBearerAuth()
  async getPayout(@Param('id') id: string, @CurrentUser() user: any) {
    const landlordId = this.getLandlordId(user);
    return this.payoutService.getPayout(id, landlordId);
  }

  // ========== Reconciliation ==========

  @Roles('LANDLORD')
  @Get('bank-feeds/transactions')
  @ApiOperation({ summary: 'List unmatched bank transactions' })
  @ApiBearerAuth()
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async listUnmatchedTransactions(
    @Query('page') page: string,
    @Query('limit') limit: string,
    @CurrentUser() user: any,
  ) {
    const landlordId = this.getLandlordId(user);
    return this.reconciliationService.listUnmatchedTransactions(
      landlordId,
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 50,
    );
  }

  @Roles('LANDLORD')
  @Post('reconciliation/suggest/:bankTransactionId')
  @ApiOperation({ summary: 'Suggest matches for bank transaction' })
  @ApiBearerAuth()
  async suggestMatches(
    @Param('bankTransactionId') bankTransactionId: string,
    @CurrentUser() user: any,
  ) {
    const landlordId = this.getLandlordId(user);
    return this.reconciliationService.suggestMatches(bankTransactionId, landlordId);
  }

  // ========== Settings ==========

  @Roles('LANDLORD')
  @Get('settings')
  @ApiOperation({ summary: 'Get finance settings' })
  @ApiBearerAuth()
  async getSettings(@CurrentUser() user: any) {
    const landlordId = this.getLandlordId(user);
    return this.financeService.getFinanceSettings(landlordId);
  }

  @Roles('LANDLORD')
  @Patch('settings')
  @ApiOperation({ summary: 'Update finance settings' })
  @ApiBearerAuth()
  async updateSettings(@Body() data: any, @CurrentUser() user: any) {
    const landlordId = this.getLandlordId(user);
    return this.financeService.updateFinanceSettings(landlordId, data);
  }

  // ========== Tenancy Balance ==========

  @Roles('LANDLORD')
  @Get('tenancies/:tenancyId/balance')
  @ApiOperation({ summary: 'Get tenancy balance' })
  @ApiBearerAuth()
  async getTenancyBalance(@Param('tenancyId') tenancyId: string, @CurrentUser() user: any) {
    const landlordId = this.getLandlordId(user);
    return this.financeService.getTenancyBalance(tenancyId, landlordId);
  }
}
