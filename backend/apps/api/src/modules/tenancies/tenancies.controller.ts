import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiOperation, ApiTags, ApiConsumes } from '@nestjs/swagger';
import { TenanciesService } from './tenancies.service';
import { CreateTenancyDto } from './dto/create-tenancy.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
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

  @Get(':id')
  @ApiOperation({ summary: 'Get tenancy by ID' })
  @ApiBearerAuth()
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
