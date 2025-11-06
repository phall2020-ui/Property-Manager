import { Module } from '@nestjs/common';
import { FlagsController, ExperimentsController, UpsellController } from './flags.controller';
import { FlagsService } from './services/flags.service';
import { PrismaModule } from '../../common/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [FlagsController, ExperimentsController, UpsellController],
  providers: [FlagsService],
  exports: [FlagsService],
})
export class FlagsModule {}
