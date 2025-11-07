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
import { ApiBearerAuth, ApiOperation, ApiTags, ApiConsumes, ApiQuery, ApiResponse } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { TicketsService } from './tickets.service';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { CreateQuoteDto } from './dto/create-quote.dto';
import { UpdateStatusDto } from './dto/update-status.dto';
import { ApproveQuoteDto } from './dto/approve-quote.dto';
import { ProposeAppointmentDto } from './dto/propose-appointment.dto';
import { ConfirmAppointmentDto } from './dto/confirm-appointment.dto';
import { AssignTicketDto } from './dto/assign-ticket.dto';
import { BulkUpdateStatusDto } from './dto/bulk-update-status.dto';
import { BulkAssignDto } from './dto/bulk-assign.dto';
import { BulkCloseDto } from './dto/bulk-close.dto';
import { BulkReassignDto } from './dto/bulk-reassign.dto';
import { BulkTagDto } from './dto/bulk-tag.dto';
import { BulkCategoryDto } from './dto/bulk-category.dto';
import { SearchTicketsDto } from './dto/search-tickets.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { diskStorage } from 'multer';
import { extname } from 'path';

@ApiTags('tickets')
@Controller('tickets')
export class TicketsController {
  private readonly logger = new Logger(TicketsController.name);

  constructor(private readonly ticketsService: TicketsService) {}

  @Throttle({ default: { limit: 5, ttl: 60000 } }) // 5 requests per minute
  @Roles('TENANT')
  @Post()
  @ApiOperation({ 
    summary: 'Create a maintenance ticket',
    description: 'Create a new maintenance ticket. Tenant must provide either propertyId or tenancyId. Ticket will be visible to the landlord immediately and appears in their list within 5 seconds via polling. Rate limited to 5 requests per minute.'
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

    const primaryRole = user.orgs?.[0]?.role || 'TENANT';

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
      createdByRole: primaryRole,
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
    summary: 'Search and filter tickets',
    description: 'List tickets filtered by role with comprehensive search and filtering options. Supports pagination, sorting, date ranges, and full-text search. Returns paginated results with total count.'
  })
  @ApiQuery({ name: 'q', required: false, description: 'Search query for title and description (min 2 chars)' })
  @ApiQuery({ name: 'id', required: false, description: 'Filter by ticket ID' })
  @ApiQuery({ name: 'date_from', required: false, description: 'Filter tickets created on or after this date (ISO 8601)' })
  @ApiQuery({ name: 'date_to', required: false, description: 'Filter tickets created on or before this date (ISO 8601)' })
  @ApiQuery({ name: 'category', required: false, description: 'Filter by ticket category' })
  @ApiQuery({ name: 'contractor_id', required: false, description: 'Filter by assigned contractor ID' })
  @ApiQuery({ name: 'propertyId', required: false, description: 'Filter by property ID' })
  @ApiQuery({ name: 'status', required: false, description: 'Filter by ticket status (OPEN, TRIAGED, QUOTED, etc.)' })
  @ApiQuery({ name: 'priority', required: false, description: 'Filter by priority (LOW, STANDARD, HIGH, URGENT)' })
  @ApiQuery({ name: 'page', required: false, description: 'Page number (default: 1)' })
  @ApiQuery({ name: 'page_size', required: false, description: 'Items per page (default: 25, max: 100)' })
  @ApiQuery({ name: 'sort_by', required: false, description: 'Sort field (created_at, updated_at, priority, status, title)', enum: ['created_at', 'updated_at', 'priority', 'status', 'title'] })
  @ApiQuery({ name: 'sort_dir', required: false, description: 'Sort direction', enum: ['asc', 'desc'] })
  @ApiResponse({ 
    status: 200, 
    description: 'Success',
    schema: {
      properties: {
        items: { type: 'array', items: { type: 'object' } },
        page: { type: 'number', example: 1 },
        page_size: { type: 'number', example: 25 },
        total: { type: 'number', example: 1234 },
        has_next: { type: 'boolean', example: true },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Bad request - Invalid query parameters' })
  @ApiResponse({ status: 413, description: 'Payload too large - page_size exceeds maximum' })
  @ApiResponse({ status: 422, description: 'Unprocessable entity - Invalid filter values' })
  @ApiBearerAuth()
  async findMany(
    @Query() query: SearchTicketsDto,
    @CurrentUser() user?: any,
  ) {
    const userOrgIds = user.orgs?.map((o: any) => o.orgId) || [];
    const primaryRole = user.orgs?.[0]?.role || 'TENANT';
    return this.ticketsService.findMany(userOrgIds, primaryRole, query);
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
  @ApiOperation({ summary: 'Update ticket status with role-based restrictions' })
  @ApiBearerAuth()
  async updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateStatusDto,
    @CurrentUser() user: any,
  ) {
    const userOrgIds = user.orgs?.map((o: any) => o.orgId) || [];
    const primaryRole = user.orgs?.[0]?.role || 'TENANT';
    return this.ticketsService.updateStatus(id, dto.to, user.sub, userOrgIds, primaryRole);
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
  @ApiOperation({ 
    summary: 'Upload ticket attachment',
    description: 'Upload a file attachment to a ticket. Maximum file size: 10MB. Allowed types: images (jpg, jpeg, png, gif, webp), documents (pdf, doc, docx, txt), and spreadsheets (xls, xlsx, csv).'
  })
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
      fileFilter: (req, file, cb) => {
        // Allowed MIME types
        const allowedMimeTypes = [
          // Images
          'image/jpeg',
          'image/jpg',
          'image/png',
          'image/gif',
          'image/webp',
          // Documents
          'application/pdf',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'text/plain',
          // Spreadsheets
          'application/vnd.ms-excel',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'text/csv',
        ];

        if (allowedMimeTypes.includes(file.mimetype)) {
          cb(null, true);
        } else {
          cb(
            new BadRequestException(
              `Invalid file type: ${file.mimetype}. Allowed types: images (jpg, jpeg, png, gif, webp), documents (pdf, doc, docx, txt), spreadsheets (xls, xlsx, csv)`
            ),
            false,
          );
        }
      },
    }),
  )
  async uploadAttachment(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: any,
  ) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    const userOrgIds = user.orgs?.map((o: any) => o.orgId) || [];
    
    try {
      const attachment = await this.ticketsService.uploadAttachment(
        id,
        file.originalname,
        file.path,
        file.mimetype,
        file.size,
        userOrgIds,
        user.id,
      );

      this.logger.log({
        action: 'attachment.uploaded',
        ticketId: id,
        filename: file.originalname,
        size: file.size,
        mimetype: file.mimetype,
      });

      return attachment;
    } catch (error) {
      this.logger.error({
        action: 'attachment.upload.failed',
        ticketId: id,
        error: error.message,
      });
      throw error;
    }
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

  @Roles('OPS')
  @Post('bulk/status')
  @ApiOperation({ 
    summary: 'Bulk update ticket status (OPS only)',
    description: 'Update status for multiple tickets at once. Limited to 50 tickets per request.'
  })
  @ApiBearerAuth()
  async bulkUpdateStatus(
    @Body() dto: BulkUpdateStatusDto,
    @CurrentUser() user: any,
  ) {
    const primaryRole = user.orgs?.[0]?.role || 'TENANT';
    return this.ticketsService.bulkUpdateStatus(
      dto.ticketIds,
      dto.status,
      user.id,
      primaryRole,
    );
  }

  @Roles('OPS')
  @Post('bulk/assign')
  @ApiOperation({ 
    summary: 'Bulk assign tickets to contractor (OPS only)',
    description: 'Assign multiple tickets to a contractor at once. Limited to 50 tickets per request.'
  })
  @ApiBearerAuth()
  async bulkAssign(
    @Body() dto: BulkAssignDto,
    @CurrentUser() user: any,
  ) {
    const primaryRole = user.orgs?.[0]?.role || 'TENANT';
    return this.ticketsService.bulkAssign(
      dto.ticketIds,
      dto.contractorId,
      user.id,
      primaryRole,
    );
  }

  @Roles('LANDLORD', 'OPS')
  @Patch(':id/assign')
  @ApiOperation({ 
    summary: 'Assign ticket to contractor',
    description: 'Assign a specific ticket to a contractor. Landlords can assign tickets for their properties, OPS can assign any ticket.'
  })
  @ApiBearerAuth()
  async assignTicket(
    @Param('id') id: string,
    @Body() dto: AssignTicketDto,
    @CurrentUser() user: any,
  ) {
    const userOrgIds = user.orgs?.map((o: any) => o.orgId) || [];
    const primaryRole = user.orgs?.[0]?.role || 'TENANT';
    return this.ticketsService.assignTicket(
      id,
      dto.contractorId,
      user.id,
      userOrgIds,
      primaryRole,
    );
  }

  @Roles('OPS')
  @Post('bulk/close')
  @ApiOperation({ 
    summary: 'Bulk close tickets (OPS only)',
    description: 'Close multiple tickets at once with optional resolution note. Limited to 50 tickets per request. Returns partial-failure reporting with 207 Multi-Status.'
  })
  @ApiResponse({ 
    status: 207, 
    description: 'Multi-Status - Partial success',
    schema: {
      properties: {
        ok: { type: 'array', items: { type: 'string' }, example: ['t1', 't2'] },
        failed: { 
          type: 'array', 
          items: { 
            type: 'object',
            properties: {
              id: { type: 'string' },
              error: { type: 'string' },
            },
          }, 
          example: [{ id: 't3', error: 'Already closed' }] 
        },
      },
    },
  })
  @ApiBearerAuth()
  async bulkClose(
    @Body() dto: BulkCloseDto,
    @CurrentUser() user: any,
    @Headers('idempotency-key') idempotencyKey?: string,
  ) {
    const primaryRole = user.orgs?.[0]?.role || 'TENANT';
    return this.ticketsService.bulkClose(
      dto.ticket_ids,
      dto.resolution_note,
      user.id,
      primaryRole,
    );
  }

  @Roles('OPS')
  @Post('bulk/reassign')
  @ApiOperation({ 
    summary: 'Bulk reassign tickets to contractor (OPS only)',
    description: 'Reassign multiple tickets to a different contractor. Limited to 50 tickets per request. Returns partial-failure reporting with 207 Multi-Status.'
  })
  @ApiResponse({ 
    status: 207, 
    description: 'Multi-Status - Partial success',
  })
  @ApiBearerAuth()
  async bulkReassign(
    @Body() dto: BulkReassignDto,
    @CurrentUser() user: any,
    @Headers('idempotency-key') idempotencyKey?: string,
  ) {
    const primaryRole = user.orgs?.[0]?.role || 'TENANT';
    return this.ticketsService.bulkReassign(
      dto.ticket_ids,
      dto.contractor_id,
      user.id,
      primaryRole,
    );
  }

  @Roles('OPS')
  @Post('bulk/tag')
  @ApiOperation({ 
    summary: 'Bulk update ticket tags (OPS only)',
    description: 'Add or remove tags from multiple tickets. Limited to 50 tickets per request. Returns partial-failure reporting with 207 Multi-Status.'
  })
  @ApiResponse({ 
    status: 207, 
    description: 'Multi-Status - Partial success',
  })
  @ApiBearerAuth()
  async bulkTag(
    @Body() dto: BulkTagDto,
    @CurrentUser() user: any,
    @Headers('idempotency-key') idempotencyKey?: string,
  ) {
    const primaryRole = user.orgs?.[0]?.role || 'TENANT';
    return this.ticketsService.bulkTag(
      dto.ticket_ids,
      dto.add,
      dto.remove,
      user.id,
      primaryRole,
    );
  }

  @Roles('OPS')
  @Post('bulk/category')
  @ApiOperation({ 
    summary: 'Bulk update ticket category (OPS only)',
    description: 'Update category for multiple tickets. Limited to 50 tickets per request. Returns partial-failure reporting with 207 Multi-Status.'
  })
  @ApiResponse({ 
    status: 207, 
    description: 'Multi-Status - Partial success',
  })
  @ApiBearerAuth()
  async bulkCategory(
    @Body() dto: BulkCategoryDto,
    @CurrentUser() user: any,
    @Headers('idempotency-key') idempotencyKey?: string,
  ) {
    const primaryRole = user.orgs?.[0]?.role || 'TENANT';
    return this.ticketsService.bulkCategory(
      dto.ticket_ids,
      dto.category,
      user.id,
      primaryRole,
    );
  }
}
