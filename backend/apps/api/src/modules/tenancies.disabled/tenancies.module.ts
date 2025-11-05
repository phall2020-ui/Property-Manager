import { Module } from '@nestjs/common';
import { PrismaModule } from '../../common/prisma/prisma.module';
import { TenanciesService } from './tenancies.service';
import { TenanciesController } from './tenancies.controller';
import { LandlordResourceGuard } from '../../common/guards/landlord-resource.guard';

@Module({
  imports: [PrismaModule],
  controllers: [TenanciesController],
  providers: [TenanciesService, LandlordResourceGuard],
})
export class TenanciesModule {}