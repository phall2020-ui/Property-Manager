import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { FlagsService } from './services/flags.service';
import {
  CreateFeatureFlagDto,
  UpdateFeatureFlagDto,
  AssignExperimentDto,
  CreateUpsellOpportunityDto,
} from './dto/flags.dto';

@ApiTags('Feature Flags & Experiments')
@ApiBearerAuth()
@Controller('flags')
export class FlagsController {
  constructor(private flagsService: FlagsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all feature flags for landlord' })
  async getFlags(@Request() req) {
    const landlordId = req.user.orgId;
    return this.flagsService.getFlags(landlordId);
  }

  @Get(':key')
  @ApiOperation({ summary: 'Get specific feature flag' })
  async getFlag(@Request() req, @Param('key') key: string) {
    const landlordId = req.user.orgId;
    return this.flagsService.getFlag(landlordId, key);
  }

  @Post()
  @ApiOperation({ summary: 'Create or update feature flag' })
  async setFlag(@Request() req, @Body() dto: CreateFeatureFlagDto) {
    const landlordId = req.user.orgId;
    return this.flagsService.upsertFlag(landlordId, dto);
  }

  @Put(':key')
  @ApiOperation({ summary: 'Update feature flag' })
  async updateFlag(
    @Request() req,
    @Param('key') key: string,
    @Body() dto: UpdateFeatureFlagDto,
  ) {
    const landlordId = req.user.orgId;
    return this.flagsService.updateFlag(landlordId, key, dto);
  }

  @Post(':key/toggle')
  @ApiOperation({ summary: 'Toggle feature flag on/off' })
  async toggleFlag(@Request() req, @Param('key') key: string) {
    const landlordId = req.user.orgId;
    return this.flagsService.toggleFlag(landlordId, key);
  }
}

@ApiTags('Experiments')
@ApiBearerAuth()
@Controller('experiments')
export class ExperimentsController {
  constructor(private flagsService: FlagsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all experiment assignments' })
  async getAssignments(@Request() req) {
    const landlordId = req.user.orgId;
    return this.flagsService.getExperimentAssignments(landlordId);
  }

  @Post('assign')
  @ApiOperation({ summary: 'Assign to experiment variant' })
  async assignExperiment(@Request() req, @Body() dto: AssignExperimentDto) {
    const landlordId = req.user.orgId;
    return this.flagsService.assignExperiment(
      landlordId,
      dto.experimentKey,
      dto.variant,
    );
  }

  @Get(':experimentKey')
  @ApiOperation({ summary: 'Get experiment assignment' })
  async getAssignment(@Request() req, @Param('experimentKey') key: string) {
    const landlordId = req.user.orgId;
    return this.flagsService.getExperimentAssignment(landlordId, key);
  }
}

@ApiTags('Upsell Opportunities')
@ApiBearerAuth()
@Controller('upsell')
export class UpsellController {
  constructor(private flagsService: FlagsService) {}

  @Get()
  @ApiOperation({ summary: 'Get upsell opportunities' })
  async getOpportunities(@Request() req, @Query('status') status?: string) {
    const landlordId = req.user.orgId;
    return this.flagsService.getUpsellOpportunities(landlordId, status);
  }

  @Post()
  @ApiOperation({ summary: 'Create upsell opportunity' })
  async createOpportunity(
    @Request() req,
    @Body() dto: CreateUpsellOpportunityDto,
  ) {
    const landlordId = req.user.orgId;
    return this.flagsService.createUpsellOpportunity(
      landlordId,
      dto.type,
      dto.status,
      dto.notes,
    );
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update upsell opportunity' })
  async updateOpportunity(
    @Request() req,
    @Param('id') id: string,
    @Body() dto: Partial<CreateUpsellOpportunityDto>,
  ) {
    const landlordId = req.user.orgId;
    return this.flagsService.updateUpsellOpportunity(id, landlordId, dto);
  }
}
