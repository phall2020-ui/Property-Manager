import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { LandlordResourceGuard } from '../../common/guards/landlord-resource.guard';
import { UseGuards } from '@nestjs/common';
import { CreateTenancyDto } from './dto/create-tenancy.dto';
import { TenanciesService } from './tenancies.service';

@ApiTags('tenancies')
@Controller('tenancies')
export class TenanciesController {
  constructor(private readonly tenanciesService: TenanciesService) {}

  @Roles('LANDLORD')
  @Post()
  @ApiOperation({ summary: 'Create a new tenancy' })
  @ApiBearerAuth()
  async create(@Body() dto: CreateTenancyDto, @CurrentUser() user: any) {
    return this.tenanciesService.create({ ...dto, landlordId: user.landlordId });
  }

  @Roles('LANDLORD')
  @UseGuards(LandlordResourceGuard)
  @Get(':id')
  @ApiOperation({ summary: 'Get tenancy by ID' })
  @ApiBearerAuth()
  async findOne(@Param('id') id: string, @CurrentUser() user: any) {
    return this.tenanciesService.findOne(id, user.landlordId);
  }

  @Roles('LANDLORD')
  @UseGuards(LandlordResourceGuard)
  @Post(':id/documents')
  @ApiOperation({ summary: 'Attach a document to a tenancy' })
  @ApiBearerAuth()
  async attach(@Param('id') id: string, @Body('documentId') documentId: string, @CurrentUser() user: any) {
    return this.tenanciesService.attachDocument(id, documentId, user.landlordId);
  }
}