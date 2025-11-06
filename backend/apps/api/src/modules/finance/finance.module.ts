import { Module } from '@nestjs/common';
import { FinanceController } from './finance.controller';
import { TenantFinanceController } from './tenant-finance.controller';
import { FinanceService } from './finance.service';
import { InvoiceService } from './services/invoice.service';
import { PaymentService } from './services/payment.service';
import { MandateService } from './services/mandate.service';
import { ReconciliationService } from './services/reconciliation.service';
import { PayoutService } from './services/payout.service';
import { FinanceMetricsService } from './services/finance-metrics.service';
import { PrismaModule } from '../../common/prisma/prisma.module';
import { EventsModule } from '../events/events.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [PrismaModule, EventsModule, NotificationsModule],
  controllers: [FinanceController, TenantFinanceController],
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
