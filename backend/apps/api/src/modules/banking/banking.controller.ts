import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { BankingService } from './services/banking.service';
import { ReconciliationService } from './services/reconciliation.service';
import {
  CreateBankConnectionDto,
  BankConnectionResponseDto,
  SyncBankAccountsDto,
} from './dto/bank-connection.dto';
import {
  ReconcileAutoDto,
  ReconcileManualDto,
  UnmatchDto,
  ReconciliationResponseDto,
} from './dto/reconciliation.dto';

@ApiTags('Banking')
@ApiBearerAuth()
@Controller('banking')
export class BankingController {
  constructor(
    private bankingService: BankingService,
    private reconciliationService: ReconciliationService,
  ) {}

  @Post('connections')
  @ApiOperation({ summary: 'Create a new bank connection (sandbox/mock)' })
  @ApiResponse({
    status: 201,
    description: 'Bank connection created',
    type: BankConnectionResponseDto,
  })
  async createConnection(
    @Request() req,
    @Body() dto: CreateBankConnectionDto,
  ) {
    const landlordId = req.user.orgId; // Assuming orgId is landlordId
    return this.bankingService.createConnection(landlordId, dto);
  }

  @Get('connections')
  @ApiOperation({ summary: 'List bank connections' })
  @ApiResponse({
    status: 200,
    description: 'Bank connections retrieved',
    type: [BankConnectionResponseDto],
  })
  async getConnections(@Request() req) {
    const landlordId = req.user.orgId;
    return this.bankingService.getConnections(landlordId);
  }

  @Get('accounts')
  @ApiOperation({ summary: 'List bank accounts' })
  @ApiResponse({ status: 200, description: 'Bank accounts retrieved' })
  async getBankAccounts(@Request() req) {
    const landlordId = req.user.orgId;
    return this.bankingService.getBankAccounts(landlordId);
  }

  @Post('sync')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Sync bank transactions' })
  @ApiResponse({ status: 200, description: 'Transactions synced' })
  async syncTransactions(
    @Request() req,
    @Query('bankAccountId') bankAccountId?: string,
  ) {
    const landlordId = req.user.orgId;
    return this.bankingService.syncTransactions(landlordId, bankAccountId);
  }

  @Post('reconcile/auto')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Run auto-reconciliation for a date range' })
  @ApiResponse({ status: 200, description: 'Auto-reconciliation completed' })
  async autoReconcile(@Request() req, @Body() dto: ReconcileAutoDto) {
    const landlordId = req.user.orgId;
    const startDate = new Date(dto.startDate);
    const endDate = new Date(dto.endDate);
    
    return this.reconciliationService.autoReconcile(
      landlordId,
      startDate,
      endDate,
      dto.bankAccountId,
    );
  }

  @Post('reconcile/manual')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Manually match transaction to invoice' })
  @ApiResponse({
    status: 200,
    description: 'Manual match created',
    type: ReconciliationResponseDto,
  })
  async manualMatch(@Request() req, @Body() dto: ReconcileManualDto) {
    const landlordId = req.user.orgId;
    return this.reconciliationService.manualMatch(
      landlordId,
      dto.bankTransactionId,
      dto.invoiceId,
    );
  }

  @Post('reconcile/unmatch')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Unmatch a bank transaction' })
  @ApiResponse({ status: 200, description: 'Transaction unmatched' })
  async unmatch(@Request() req, @Body() dto: UnmatchDto) {
    const landlordId = req.user.orgId;
    return this.reconciliationService.unmatch(landlordId, dto.bankTransactionId);
  }
}
