import { Body, Controller, Get, Param, Post, Patch, Delete, Query, ForbiddenException, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags, ApiForbiddenResponse, ApiNotFoundResponse } from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import { ResourceType } from '../../common/decorators/resource-type.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { LandlordResourceGuard } from '../../common/guards/landlord-resource.guard';
import { CreatePropertyDto } from './dto/create-property.dto';
import { UpdatePropertyDto } from './dto/update-property.dto';
import { DeletePropertyQueryDto } from './dto/delete-property-query.dto';
import { ListPropertiesQueryDto } from './dto/list-properties-query.dto';
import { PropertiesService } from './properties.service';

@ApiTags('properties')
@Controller('properties')
export class PropertiesController {
  constructor(private readonly propertiesService: PropertiesService) {}

  @Roles('LANDLORD')
  @Post()
  @ApiOperation({ summary: 'Create a new property' })
  @ApiBearerAuth()
  @ApiForbiddenResponse({ description: 'User is not a landlord' })
  async create(@Body() dto: CreatePropertyDto, @CurrentUser() user: any) {
    // Get user's landlord org
    const landlordOrg = user.orgs?.find((o: any) => o.role === 'LANDLORD');
    if (!landlordOrg) {
      throw new ForbiddenException('User is not a landlord');
    }
    return this.propertiesService.create({ ...dto, ownerOrgId: landlordOrg.orgId });
  }

  @Roles('LANDLORD')
  @UseGuards(LandlordResourceGuard)
  @ResourceType('property')
  @Get(':id')
  @ApiOperation({ summary: 'Get property by ID' })
  @ApiBearerAuth()
  @ApiForbiddenResponse({ description: 'User is not a landlord' })
  @ApiNotFoundResponse({ description: 'Property not found or access denied' })
  async findOne(@Param('id') id: string, @CurrentUser() user: any) {
    const landlordOrg = user.orgs?.find((o: any) => o.role === 'LANDLORD');
    if (!landlordOrg) {
      throw new ForbiddenException('User is not a landlord');
    }
    return this.propertiesService.findOne(id, landlordOrg.orgId);
  }

  @Roles('LANDLORD', 'CONTRACTOR')
  @Get()
  @ApiOperation({ summary: 'List and search properties. Landlords see their properties, contractors see properties from assigned tickets.' })
  @ApiBearerAuth()
  @ApiForbiddenResponse({ description: 'User must be a landlord or contractor' })
  async findMany(
    @Query() query: ListPropertiesQueryDto,
    @CurrentUser() user?: any,
  ) {
    const landlordOrg = user.orgs?.find((o: any) => o.role === 'LANDLORD');
    const contractorOrg = user.orgs?.find((o: any) => o.role === 'CONTRACTOR');
    
    if (landlordOrg) {
      // Landlord: return their properties
      return this.propertiesService.findMany(landlordOrg.orgId, query);
    } else if (contractorOrg) {
      // Contractor: return properties from tickets assigned to them
      return this.propertiesService.findPropertiesForContractor(user.id);
    } else {
      throw new ForbiddenException('User must be a landlord or contractor');
    }
  }

  @Roles('LANDLORD')
  @UseGuards(LandlordResourceGuard)
  @ResourceType('property')
  @Patch(':id')
  @ApiOperation({ 
    summary: 'Update a property',
    description: 'Update property details. Only the property owner can update. Postcode is validated and normalized to uppercase. Supports partial updates.'
  })
  @ApiBearerAuth()
  @ApiForbiddenResponse({ description: 'User is not a landlord' })
  @ApiNotFoundResponse({ description: 'Property not found or access denied' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdatePropertyDto,
    @CurrentUser() user: any,
  ) {
    const landlordOrg = user.orgs?.find((o: any) => o.role === 'LANDLORD');
    if (!landlordOrg) {
      throw new ForbiddenException('User is not a landlord');
    }
    return this.propertiesService.update(id, landlordOrg.orgId, dto);
  }

  @Roles('LANDLORD')
  @UseGuards(LandlordResourceGuard)
  @ResourceType('property')
  @Delete(':id')
  @ApiOperation({ 
    summary: 'Soft delete a property',
    description: 'Soft delete a property. Returns 409 if there are active or scheduled tenancies unless force=true. Optionally purge images with purgeImages=true.',
  })
  @ApiBearerAuth()
  @ApiForbiddenResponse({ description: 'User is not a landlord' })
  @ApiNotFoundResponse({ description: 'Property not found or access denied' })
  async delete(
    @Param('id') id: string,
    @Query() query: DeletePropertyQueryDto,
    @CurrentUser() user: any,
  ) {
    const landlordOrg = user.orgs?.find((o: any) => o.role === 'LANDLORD');
    if (!landlordOrg) {
      throw new ForbiddenException('User is not a landlord');
    }
    return this.propertiesService.delete(id, landlordOrg.orgId, query);
  }

  @Roles('LANDLORD')
  @UseGuards(LandlordResourceGuard)
  @ResourceType('property')
  @Post(':id/restore')
  @ApiOperation({ 
    summary: 'Restore a soft-deleted property',
    description: 'Restore a property that was previously soft-deleted.',
  })
  @ApiBearerAuth()
  @ApiForbiddenResponse({ description: 'User is not a landlord' })
  @ApiNotFoundResponse({ description: 'Property not found or access denied' })
  async restore(
    @Param('id') id: string,
    @CurrentUser() user: any,
  ) {
    const landlordOrg = user.orgs?.find((o: any) => o.role === 'LANDLORD');
    if (!landlordOrg) {
      throw new ForbiddenException('User is not a landlord');
    }
    return this.propertiesService.restore(id, landlordOrg.orgId);
  }
}