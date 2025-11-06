import { Module } from '@nestjs/common';
import { LandlordController } from './landlord.controller';
import { TicketsModule } from '../tickets/tickets.module';

@Module({
  imports: [TicketsModule],
  controllers: [LandlordController],
})
export class LandlordModule {}
