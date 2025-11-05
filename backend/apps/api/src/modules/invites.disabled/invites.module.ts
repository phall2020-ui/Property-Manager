import { Module } from '@nestjs/common';
import { PrismaModule } from '../../common/prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { InvitesService } from './invites.service';
import { InvitesController } from './invites.controller';
import { LandlordResourceGuard } from '../../common/guards/landlord-resource.guard';

@Module({
  imports: [PrismaModule, AuthModule, NotificationsModule],
  providers: [InvitesService, LandlordResourceGuard],
  controllers: [InvitesController],
})
export class InvitesModule {}