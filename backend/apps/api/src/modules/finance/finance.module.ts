import { Module } from '@nestjs/common';
import { FinanceController } from './finance.controller';
import { TenantFinanceController } from './tenant-finance.controller';
import { WebhookController } from './webhook.controller';
import { FinanceService } from './finance.service';
import { InvoiceService } from './services/invoice.service';
import { PaymentService } from './services/payment.service';
import { MandateService } from './services/mandate.service';
import { ReconciliationService } from './services/reconciliation.service';
import { PayoutService } from './services/payout.service';
import { FinanceMetricsService } from './services/finance-metrics.service';
import { WebhookService } from './services/webhook.service';
import { LateFeeService } from './services/late-fee.service';
import { RecurringInvoiceService } from './services/recurring-invoice.service';
import { PaymentRemindersService } from './services/payment-reminders.service';
import { InvoicePdfService } from './services/invoice-pdf.service';
import { ReceiptPdfService } from './services/receipt-pdf.service';
import { GoCardlessProvider } from './providers/gocardless.provider';
import { StripeProvider } from './providers/stripe.provider';
import { PrismaModule } from '../../common/prisma/prisma.module';
import { EventsModule } from '../events/events.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { StorageModule } from '../../common/storage/storage.module';

@Module({
  imports: [PrismaModule, EventsModule, NotificationsModule, StorageModule],
  controllers: [FinanceController, TenantFinanceController, WebhookController],
  providers: [
    FinanceService,
    InvoiceService,
    PaymentService,
    MandateService,
    ReconciliationService,
    PayoutService,
    FinanceMetricsService,
    WebhookService,
    LateFeeService,
    RecurringInvoiceService,
    PaymentRemindersService,
    InvoicePdfService,
    ReceiptPdfService,
    GoCardlessProvider,
    StripeProvider,
  ],
  exports: [
    FinanceService,
    InvoiceService,
    PaymentService,
    WebhookService,
  ],
})
export class FinanceModule {}
