import {
  Controller,
  Post,
  Get,
  Patch,
  Param,
  Body,
  Query,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  Headers,
  Logger,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiOperation, ApiTags, ApiConsumes } from '@nestjs/swagger';
import { TicketsService } from './tickets.service';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { CreateQuoteDto } from './dto/create-quote.dto';
import { UpdateStatusDto } from './dto/update-status.dto';
import { ApproveQuoteDto } from './dto/approve-quote.dto';
import { ProposeAppointmentDto } from './dto/propose-appointment.dto';
import { ConfirmAppointmentDto } from './dto/confirm-appointment.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { diskStorage } from 'multer';
import { extname } from 'path';

@ApiTags('tickets')
@Controller('tickets')
export class TicketsController {
  private readonly logger = new Logger(TicketsController.name);

  constructor(private readonly ticketsService: TicketsService) {}

  @Roles('TENANT')
  @Post()
  @ApiOperation({ 
    summary: 'Create a maintenance ticket',
    description: 'Create a new maintenance ticket. Tenant must provide either propertyId or tenancyId. Ticket will be visible to the landlord immediately and appears in their list within 5 seconds via polling.'
  })
  @ApiBearerAuth()
  async create(@Body() dto: CreateTicketDto, @CurrentUser() user: any) {
    // Get landlordId from property or tenancy
    let landlordId: string;
    if (dto.propertyId) {
      const property = await this.ticketsService.findProperty(dto.propertyId);
      landlordId = property.ownerOrgId;
    } else if (dto.tenancyId) {
      const tenancy = await this.ticketsService.findTenancy(dto.tenancyId);
      landlordId = tenancy.property.ownerOrgId;
    } else {
      throw new BadRequestException('Either propertyId or tenancyId must be provided');
    }

    this.logger.log({
      action: 'ticket.create',
      userId: user.sub,
      landlordId,
      propertyId: dto.propertyId,
      tenancyId: dto.tenancyId,
      priority: dto.priority,
    });

    const ticket = await this.ticketsService.create({
      ...dto,
      landlordId,
      createdById: user.id,
    });

    this.logger.log({
      action: 'ticket.created',
      ticketId: ticket.id,
      landlordId,
      propertyId: dto.propertyId,
    });

    return ticket;
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get ticket by ID' })
  @ApiBearerAuth()
  async findOne(@Param('id') id: string, @CurrentUser() user: any) {
    const userOrgIds = user.orgs?.map((o: any) => o.orgId) || [];
    return this.ticketsService.findOne(id, userOrgIds);
  }

  @Get()
  @ApiOperation({ 
    summary: 'List tickets',
    description: 'List tickets filtered by role. Landlords see tickets for their properties, tenants see their own tickets. Supports filtering by propertyId and status.'
  })
  @ApiBearerAuth()
  async findMany(
    @Query('propertyId') propertyId?: string,
    @Query('status') status?: string,
    @CurrentUser() user?: any,
  ) {
    const userOrgIds = user.orgs?.map((o: any) => o.orgId) || [];
    const primaryRole = user.orgs?.[0]?.role || 'TENANT';
    return this.ticketsService.findMany(userOrgIds, primaryRole, { propertyId, status });
  }

  @Roles('CONTRACTOR')
  @Post(':id/quote')
  @ApiOperation({ summary: 'Submit a quote for a ticket' })
  @ApiBearerAuth()
  async createQuote(
    @Param('id') id: string,
    @Body() dto: CreateQuoteDto,
    @CurrentUser() user: any,
  ) {
    return this.ticketsService.createQuote(id, user.id, dto.amount, dto.notes);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Update ticket status' })
  @ApiBearerAuth()
  async updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateStatusDto,
    @CurrentUser() user: any,
  ) {
    const userOrgIds = user.orgs?.map((o: any) => o.orgId) || [];
    return this.ticketsService.updateStatus(id, dto.to, user.sub, userOrgIds);
  }

  @Get(':id/timeline')
  @ApiOperation({ summary: 'Get ticket timeline' })
  @ApiBearerAuth()
  async getTimeline(@Param('id') id: string, @CurrentUser() user: any) {
    const userOrgIds = user.orgs?.map((o: any) => o.orgId) || [];
    return this.ticketsService.getTimeline(id, userOrgIds);
  }

  @Roles('LANDLORD')
  @Post(':id/approve')
  @ApiOperation({ summary: 'Approve ticket (approve the quote)' })
  @ApiBearerAuth()
  async approveTicket(
    @Param('id') id: string,
    @Body() dto: ApproveQuoteDto,
    @CurrentUser() user: any,
    @Headers('idempotency-key') idempotencyKey?: string,
  ) {
    const userOrgIds = user.orgs?.map((o: any) => o.orgId) || [];
    const key = idempotencyKey || dto.idempotencyKey;
    return this.ticketsService.approveTicket(id, user.sub, userOrgIds, key);
  }

  @Roles('LANDLORD')
  @Post('quotes/:quoteId/approve')
  @ApiOperation({ summary: 'Approve a quote' })
  @ApiBearerAuth()
  async approveQuote(@Param('quoteId') quoteId: string, @CurrentUser() user: any) {
    const userOrgIds = user.orgs?.map((o: any) => o.orgId) || [];
    return this.ticketsService.approveQuote(quoteId, userOrgIds);
  }

  @Roles('CONTRACTOR')
  @Post(':id/complete')
  @ApiOperation({ summary: 'Mark ticket as complete' })
  @ApiBearerAuth()
  async complete(
    @Param('id') id: string,
    @Body() body: { completionNotes?: string },
    @CurrentUser() user: any,
  ) {
    return this.ticketsService.completeTicket(id, user.id, body.completionNotes);
  }

  @Post(':id/attachments')
  @ApiOperation({ summary: 'Upload ticket attachment' })
  @ApiConsumes('multipart/form-data')
  @ApiBearerAuth()
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './uploads/tickets',
        filename: (req, file, cb) => {
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
          cb(null, `${uniqueSuffix}${extname(file.originalname)}`);
        },
      }),
      limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
    }),
  )
  async uploadAttachment(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: any,
  ) {
    const userOrgIds = user.orgs?.map((o: any) => o.orgId) || [];
    return this.ticketsService.uploadAttachment(
      id,
      file.originalname,
      file.path,
      file.mimetype,
      file.size,
      userOrgIds,
    );
  }

  @Roles('CONTRACTOR')
  @Post(':id/appointments')
  @ApiOperation({ 
    summary: 'Propose an appointment for a ticket',
    description: 'Contractor proposes appointment slots after ticket is approved'
  })
  @ApiBearerAuth()
  async proposeAppointment(
    @Param('id') id: string,
    @Body() dto: ProposeAppointmentDto,
    @CurrentUser() user: any,
  ) {
    return this.ticketsService.proposeAppointment(
      id,
      user.id,
      new Date(dto.startAt),
      dto.endAt ? new Date(dto.endAt) : null,
      dto.notes,
    );
  }

  @Get(':id/appointments')
  @ApiOperation({ summary: 'Get appointments for a ticket' })
  @ApiBearerAuth()
  async getTicketAppointments(@Param('id') id: string, @CurrentUser() user: any) {
    return this.ticketsService.getTicketAppointments(id);
  }

  @Roles('TENANT', 'LANDLORD', 'OPS')
  @Post('appointments/:appointmentId/confirm')
  @ApiOperation({ 
    summary: 'Confirm an appointment',
    description: 'Tenant or landlord confirms a proposed appointment. This moves the ticket to SCHEDULED status and schedules auto-transition to IN_PROGRESS at start time.'
  })
  @ApiBearerAuth()
  async confirmAppointment(
    @Param('appointmentId') appointmentId: string,
    @Body() dto: ConfirmAppointmentDto,
    @CurrentUser() user: any,
  ) {
    const primaryRole = user.orgs?.[0]?.role || 'TENANT';
    return this.ticketsService.confirmAppointment(appointmentId, user.id, primaryRole);
  }

  @Get('appointments/:appointmentId')
  @ApiOperation({ summary: 'Get appointment details' })
  @ApiBearerAuth()
  async getAppointment(@Param('appointmentId') appointmentId: string) {
    return this.ticketsService.findAppointment(appointmentId);
  }
}
