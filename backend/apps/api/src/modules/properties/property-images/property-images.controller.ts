import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  UseInterceptors,
  UploadedFile,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiTags, ApiBody } from '@nestjs/swagger';
import { Roles } from '../../../common/decorators/roles.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { PropertyImagesService } from './property-images.service';
import { CreatePropertyImageDto } from './dto/create-property-image.dto';
import { UpdatePropertyImageDto } from './dto/update-property-image.dto';

@ApiTags('property-images')
@Controller('properties/:propertyId/images')
export class PropertyImagesController {
  constructor(private readonly propertyImagesService: PropertyImagesService) {}

  @Roles('LANDLORD')
  @Post()
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload an image for a property' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
        name: {
          type: 'string',
          description: 'Optional display name',
        },
        sortOrder: {
          type: 'number',
          description: 'Optional sort order',
        },
      },
    },
  })
  @ApiBearerAuth()
  async create(
    @Param('propertyId') propertyId: string,
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: CreatePropertyImageDto,
    @CurrentUser() user: any,
  ) {
    const landlordOrg = user.orgs?.find((o: any) => o.role === 'LANDLORD');
    if (!landlordOrg) {
      throw new ForbiddenException('User is not a landlord');
    }

    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    return this.propertyImagesService.create(propertyId, landlordOrg.orgId, file, dto);
  }

  @Roles('LANDLORD')
  @Get()
  @ApiOperation({ summary: 'List all images for a property' })
  @ApiBearerAuth()
  async findAll(@Param('propertyId') propertyId: string, @CurrentUser() user: any) {
    const landlordOrg = user.orgs?.find((o: any) => o.role === 'LANDLORD');
    if (!landlordOrg) {
      throw new ForbiddenException('User is not a landlord');
    }

    return this.propertyImagesService.findAll(propertyId, landlordOrg.orgId);
  }

  @Roles('LANDLORD')
  @Patch(':imageId')
  @ApiOperation({ summary: 'Update image metadata (name, sort order)' })
  @ApiBearerAuth()
  async update(
    @Param('propertyId') propertyId: string,
    @Param('imageId') imageId: string,
    @Body() dto: UpdatePropertyImageDto,
    @CurrentUser() user: any,
  ) {
    const landlordOrg = user.orgs?.find((o: any) => o.role === 'LANDLORD');
    if (!landlordOrg) {
      throw new ForbiddenException('User is not a landlord');
    }

    return this.propertyImagesService.update(propertyId, imageId, landlordOrg.orgId, dto);
  }

  @Roles('LANDLORD')
  @Delete(':imageId')
  @ApiOperation({ summary: 'Delete a property image' })
  @ApiBearerAuth()
  async delete(
    @Param('propertyId') propertyId: string,
    @Param('imageId') imageId: string,
    @CurrentUser() user: any,
  ) {
    const landlordOrg = user.orgs?.find((o: any) => o.role === 'LANDLORD');
    if (!landlordOrg) {
      throw new ForbiddenException('User is not a landlord');
    }

    return this.propertyImagesService.delete(propertyId, imageId, landlordOrg.orgId);
  }
}
