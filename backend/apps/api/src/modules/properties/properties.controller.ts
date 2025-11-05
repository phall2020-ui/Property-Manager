import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CreatePropertyDto } from './dto/create-property.dto';
import { PropertiesService } from './properties.service';

@ApiTags('properties')
@Controller('properties')
export class PropertiesController {
  constructor(private readonly propertiesService: PropertiesService) {}

  @Roles('LANDLORD')
  @Post()
  @ApiOperation({ summary: 'Create a new property' })
  @ApiBearerAuth()
  async create(@Body() dto: CreatePropertyDto, @CurrentUser() user: any) {
    // Get user's landlord org
    const landlordOrg = user.orgs?.find((o: any) => o.role === 'LANDLORD');
    if (!landlordOrg) {
      throw new Error('User is not a landlord');
    }
    return this.propertiesService.create({ ...dto, ownerOrgId: landlordOrg.orgId });
  }

  @Roles('LANDLORD')
  // @UseGuards(LandlordResourceGuard) // TODO: Update guard for org-based
  @Get(':id')
  @ApiOperation({ summary: 'Get property by ID' })
  @ApiBearerAuth()
  async findOne(@Param('id') id: string, @CurrentUser() user: any) {
    const landlordOrg = user.orgs?.find((o: any) => o.role === 'LANDLORD');
    if (!landlordOrg) {
      throw new Error('User is not a landlord');
    }
    return this.propertiesService.findOne(id, landlordOrg.orgId);
  }

  @Roles('LANDLORD')
  @Get()
  @ApiOperation({ summary: 'List properties of current landlord' })
  @ApiBearerAuth()
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async findMany(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @CurrentUser() user?: any,
  ) {
    const landlordOrg = user.orgs?.find((o: any) => o.role === 'LANDLORD');
    if (!landlordOrg) {
      throw new Error('User is not a landlord');
    }
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 20;
    return this.propertiesService.findMany(landlordOrg.orgId, pageNum, limitNum);
  }
}