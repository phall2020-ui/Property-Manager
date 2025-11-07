import { Module } from '@nestjs/common';
import { BankingController } from './banking.controller';
import { BankingService } from './services/banking.service';
import { ReconciliationService } from './services/reconciliation.service';
import { MockBankProvider } from './providers/mock-bank.provider';
import { TrueLayerProvider } from './providers/truelayer.provider';
import { YapilyProvider } from './providers/yapily.provider';
import { PrismaModule } from '../../common/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [BankingController],
  providers: [
    BankingService,
    ReconciliationService,
    MockBankProvider,
    TrueLayerProvider,
    YapilyProvider,
  ],
  exports: [BankingService, ReconciliationService],
})
export class BankingModule {}
