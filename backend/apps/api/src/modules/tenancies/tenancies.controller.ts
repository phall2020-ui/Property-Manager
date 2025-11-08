import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Param,
  Body,
  UseInterceptors,
  UploadedFile,
  UseGuards,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiOperation, ApiTags, ApiConsumes, ApiForbiddenResponse, ApiNotFoundResponse } from '@nestjs/swagger';
import { TenanciesService } from './tenancies.service';
import { CreateTenancyDto } from './dto/create-tenancy.dto';
import { UpdateTenancyDto } from './dto/update-tenancy.dto';
import { TerminateTenancyDto } from './dto/terminate-tenancy.dto';
import { RenewTenancyDto } from './dto/renew-tenancy.dto';
import { RentIncreaseDto } from './dto/rent-increase.dto';
import { CreateGuarantorDto } from './dto/create-guarantor.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { ResourceType } from '../../common/decorators/resource-type.decorator';
import { LandlordResourceGuard } from '../../common/guards/landlord-resource.guard';
import { diskStorage } from 'multer';
import { extname } from 'path';

@ApiTags('tenancies')
@Controller('tenancies')
export class TenanciesController {
  constructor(private readonly tenanciesService: TenanciesService) {}

  @Roles('LANDLORD')
  @Post()
  @ApiOperation({ summary: 'Create a new tenancy' })
  @ApiBearerAuth()
  @ApiForbiddenResponse({ description: 'User is not a landlord' })
  async create(@Body() dto: CreateTenancyDto, @CurrentUser() user: any) {
    const landlordOrg = user.orgs?.find((o: any) => o.role === 'LANDLORD');
    if (!landlordOrg) {
      throw new Error('User is not a landlord');
    }

    return this.tenanciesService.create({
      ...dto,
      startDate: new Date(dto.startDate),
      endDate: dto.endDate ? new Date(dto.endDate) : undefined,
      ownerOrgId: landlordOrg.orgId,
    });
  }

  @UseGuards(LandlordResourceGuard)
  @ResourceType('tenancy')
  @Get(':id')
  @ApiOperation({ summary: 'Get tenancy by ID' })
  @ApiBearerAuth()
  @ApiNotFoundResponse({ description: 'Tenancy not found or access denied' })
  async findOne(@Param('id') id: string, @CurrentUser() user: any) {
    const userOrgIds = user.orgs?.map((o: any) => o.orgId) || [];
    return this.tenanciesService.findOne(id, userOrgIds);
  }

  @Get()
  @ApiOperation({ summary: 'List tenancies' })
  @ApiBearerAuth()
  async findMany(@CurrentUser() user: any) {
    const userOrgIds = user.orgs?.map((o: any) => o.orgId) || [];
    const primaryRole = user.orgs?.[0]?.role || 'TENANT';
    return this.tenanciesService.findMany(userOrgIds, primaryRole);
  }

  @Roles('LANDLORD', 'OPS')
  @UseGuards(LandlordResourceGuard)
  @ResourceType('tenancy')
  @Patch(':id')
  @ApiOperation({ summary: 'Update tenancy details' })
  @ApiBearerAuth()
  @ApiForbiddenResponse({ description: 'Insufficient permissions' })
  @ApiNotFoundResponse({ description: 'Tenancy not found or access denied' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateTenancyDto,
    @CurrentUser() user: any,
  ) {
    const userOrgIds = user.orgs?.map((o: any) => o.orgId) || [];
    return this.tenanciesService.update(id, dto, userOrgIds, user.id);
  }

  @Roles('LANDLORD', 'OPS')
  @UseGuards(LandlordResourceGuard)
  @ResourceType('tenancy')
  @Post(':id/terminate')
  @ApiOperation({ summary: 'Terminate tenancy' })
  @ApiBearerAuth()
  @ApiForbiddenResponse({ description: 'Insufficient permissions' })
  @ApiNotFoundResponse({ description: 'Tenancy not found or access denied' })
  async terminate(
    @Param('id') id: string,
    @Body() dto: TerminateTenancyDto,
    @CurrentUser() user: any,
  ) {
    const userOrgIds = user.orgs?.map((o: any) => o.orgId) || [];
    return this.tenanciesService.terminate(id, dto, userOrgIds, user.id);
  }

  @Roles('LANDLORD', 'OPS')
  @UseGuards(LandlordResourceGuard)
  @ResourceType('tenancy')
  @Post(':id/renew')
  @ApiOperation({ summary: 'Renew tenancy' })
  @ApiBearerAuth()
  @ApiForbiddenResponse({ description: 'Insufficient permissions' })
  @ApiNotFoundResponse({ description: 'Tenancy not found or access denied' })
  async renew(
    @Param('id') id: string,
    @Body() dto: RenewTenancyDto,
    @CurrentUser() user: any,
  ) {
    const userOrgIds = user.orgs?.map((o: any) => o.orgId) || [];
    return this.tenanciesService.renew(id, dto, userOrgIds, user.id);
  }

  @Roles('LANDLORD', 'OPS')
  @UseGuards(LandlordResourceGuard)
  @ResourceType('tenancy')
  @Post(':id/rent-increase')
  @ApiOperation({ summary: 'Apply rent increase' })
  @ApiBearerAuth()
  @ApiForbiddenResponse({ description: 'Insufficient permissions' })
  @ApiNotFoundResponse({ description: 'Tenancy not found or access denied' })
  async rentIncrease(
    @Param('id') id: string,
    @Body() dto: RentIncreaseDto,
    @CurrentUser() user: any,
  ) {
    const userOrgIds = user.orgs?.map((o: any) => o.orgId) || [];
    return this.tenanciesService.applyRentIncrease(id, dto, userOrgIds, user.id);
  }

  @Roles('LANDLORD', 'OPS')
  @UseGuards(LandlordResourceGuard)
  @ResourceType('tenancy')
  @Post(':id/guarantors')
  @ApiOperation({ summary: 'Add guarantor to tenancy' })
  @ApiBearerAuth()
  @ApiForbiddenResponse({ description: 'Insufficient permissions' })
  @ApiNotFoundResponse({ description: 'Tenancy not found or access denied' })
  async addGuarantor(
    @Param('id') id: string,
    @Body() dto: CreateGuarantorDto,
    @CurrentUser() user: any,
  ) {
    const userOrgIds = user.orgs?.map((o: any) => o.orgId) || [];
    return this.tenanciesService.addGuarantor(id, dto, userOrgIds, user.id);
  }

  @Roles('LANDLORD', 'OPS')
  @Delete('guarantors/:id')
  @ApiOperation({ summary: 'Remove guarantor' })
  @ApiBearerAuth()
  @ApiForbiddenResponse({ description: 'Insufficient permissions' })
  async removeGuarantor(@Param('id') id: string, @CurrentUser() user: any) {
    const userOrgIds = user.orgs?.map((o: any) => o.orgId) || [];
    return this.tenanciesService.removeGuarantor(id, userOrgIds, user.id);
  }

  @UseGuards(LandlordResourceGuard)
  @ResourceType('tenancy')
  @Get(':id/payments')
  @ApiOperation({ summary: 'Get tenancy payments (read-only)' })
  @ApiBearerAuth()
  @ApiNotFoundResponse({ description: 'Tenancy not found or access denied' })
  async getPayments(@Param('id') id: string, @CurrentUser() user: any) {
    const userOrgIds = user.orgs?.map((o: any) => o.orgId) || [];
    return this.tenanciesService.getPayments(id, userOrgIds);
  }

  @Post(':id/documents')
  @ApiOperation({ summary: 'Upload tenancy document' })
  @ApiConsumes('multipart/form-data')
  @ApiBearerAuth()
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './uploads/tenancies',
        filename: (req, file, cb) => {
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
          cb(null, `${uniqueSuffix}${extname(file.originalname)}`);
        },
      }),
      limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
    }),
  )
  async uploadDocument(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: any,
  ) {
    const userOrgIds = user.orgs?.map((o: any) => o.orgId) || [];
    return this.tenanciesService.uploadDocument(
      id,
      file.originalname,
      file.path,
      file.mimetype,
      file.size,
      userOrgIds,
    );
  }
}
