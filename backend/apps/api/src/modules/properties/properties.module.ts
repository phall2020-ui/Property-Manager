import { Module } from '@nestjs/common';
import { PropertiesService } from './properties.service';
import { PropertiesController } from './properties.controller';
import { PropertyImagesController } from './property-images/property-images.controller';
import { PropertyImagesService } from './property-images/property-images.service';
import { PrismaModule } from '../../common/prisma/prisma.module';
import { StorageService } from '../../lib/storage/storage.service';

@Module({
  imports: [PrismaModule],
  controllers: [PropertiesController, PropertyImagesController],
  providers: [PropertiesService, PropertyImagesService, StorageService],
})
export class PropertiesModule {}