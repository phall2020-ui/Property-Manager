import { Module } from '@nestjs/common';
import { FinanceController } from './finance.controller';
import { FinanceService } from './finance.service';
import { InvoiceService } from './services/invoice.service';
import { PaymentService } from './services/payment.service';
import { MandateService } from './services/mandate.service';
import { ReconciliationService } from './services/reconciliation.service';
import { PayoutService } from './services/payout.service';
import { FinanceMetricsService } from './services/finance-metrics.service';
import { PrismaModule } from '../../common/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [FinanceController],
  providers: [
    FinanceService,
    InvoiceService,
    PaymentService,
    MandateService,
    ReconciliationService,
    PayoutService,
    FinanceMetricsService,
  ],
  exports: [
    FinanceService,
    InvoiceService,
    PaymentService,
  ],
})
export class FinanceModule {}
