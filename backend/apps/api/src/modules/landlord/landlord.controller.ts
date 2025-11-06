import {
  Controller,
  Post,
  Body,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { TicketsService } from '../tickets/tickets.service';
import { CreateTicketDto } from '../tickets/dto/create-ticket.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('landlord')
@Controller('landlord')
export class LandlordController {
  private readonly logger = new Logger(LandlordController.name);

  constructor(private readonly ticketsService: TicketsService) {}

  @Roles('LANDLORD', 'OPS')
  @Post('tickets')
  @ApiOperation({ 
    summary: 'Create a maintenance ticket (Landlord)',
    description: 'Landlord creates a maintenance ticket for their property. Ticket is visible to tenant immediately. If tenancyId is not provided, the latest active tenancy for the property is used.'
  })
  @ApiBearerAuth()
  async createTicket(@Body() dto: CreateTicketDto, @CurrentUser() user: any) {
    if (!dto.propertyId) {
      throw new BadRequestException('propertyId is required for landlord ticket creation');
    }

    // Get landlordId from user's org
    const landlordOrgId = user.orgs?.[0]?.orgId;
    if (!landlordOrgId) {
      throw new BadRequestException('User is not associated with a landlord organization');
    }

    this.logger.log({
      action: 'landlord.ticket.create',
      userId: user.id,
      landlordId: landlordOrgId,
      propertyId: dto.propertyId,
      tenancyId: dto.tenancyId,
      priority: dto.priority,
    });

    const ticket = await this.ticketsService.createByLandlord({
      landlordId: landlordOrgId,
      propertyId: dto.propertyId,
      tenancyId: dto.tenancyId,
      title: dto.title,
      description: dto.description,
      priority: dto.priority,
      category: dto.category,
      createdById: user.id,
    });

    this.logger.log({
      action: 'landlord.ticket.created',
      ticketId: ticket.id,
      landlordId: landlordOrgId,
      propertyId: dto.propertyId,
    });

    return ticket;
  }
}
