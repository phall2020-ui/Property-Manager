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
import { BulkResponseInterceptor } from '../../common/interceptors/bulk-response.interceptor';
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
    summary: 'List tickets with comprehensive filtering',
    description: 'List tickets filtered by role. Supports filters: q (title+description), id, date_from, date_to, category, contractor_id. Includes pagination (page, page_size) and sorting (sort_by, sort_dir).'
  })
  @ApiQuery({ name: 'q', required: false, description: 'Search query for title and description (min 2 chars)', example: 'leak' })
  @ApiQuery({ name: 'id', required: false, description: 'Filter by ticket ID', example: '123e4567-e89b-12d3-a456-426614174000' })
  @ApiQuery({ name: 'date_from', required: false, description: 'Filter tickets created on or after this date (ISO 8601)', example: '2024-01-01' })
  @ApiQuery({ name: 'date_to', required: false, description: 'Filter tickets created on or before this date (ISO 8601)', example: '2024-12-31' })
  @ApiQuery({ name: 'category', required: false, description: 'Filter by ticket category', example: 'plumbing' })
  @ApiQuery({ name: 'contractor_id', required: false, description: 'Filter by assigned contractor ID' })
  @ApiQuery({ name: 'status', required: false, description: 'Filter by ticket status', enum: ['OPEN', 'TRIAGED', 'QUOTED', 'APPROVED', 'SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'AUDITED', 'CANCELLED'] })
  @ApiQuery({ name: 'priority', required: false, description: 'Filter by priority', enum: ['LOW', 'STANDARD', 'HIGH', 'URGENT'] })
  @ApiQuery({ name: 'page', required: false, description: 'Page number (default: 1)', example: 1 })
  @ApiQuery({ name: 'page_size', required: false, description: 'Items per page (default: 25, max: 100)', example: 25 })
  @ApiQuery({ name: 'sort_by', required: false, description: 'Sort field (default: created_at)', enum: ['created_at', 'updated_at', 'status', 'priority', 'category'] })
  @ApiQuery({ name: 'sort_dir', required: false, description: 'Sort direction: asc or desc (default: desc)', enum: ['asc', 'desc'] })
  @ApiResponse({
    status: 200,
    description: 'List of tickets with pagination',
    schema: {
      example: {
        items: [
          {
            id: '123e4567-e89b-12d3-a456-426614174000',
            title: 'Leaking kitchen faucet',
            description: 'The faucet is dripping constantly',
            category: 'plumbing',
            status: 'OPEN',
            priority: 'STANDARD',
            createdAt: '2024-01-15T10:30:00Z',
            createdBy: {
              id: 'user-123',
              name: 'John Tenant',
              email: 'john@example.com'
            }
          }
        ],
        page: 1,
        page_size: 25,
        total: 145,
        has_next: true
      }
    }
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request - Invalid parameters',
    schema: {
      example: {
        code: 'BAD_REQUEST',
        message: 'Search query (q) must be at least 2 characters',
        details: {}
      }
    }
  })
  @ApiBearerAuth()
  async findMany(
    @Query('q') q?: string,
    @Query('id') id?: string,
    @Query('date_from') dateFrom?: string,
    @Query('date_to') dateTo?: string,
    @Query('category') category?: string,
    @Query('contractor_id') contractorId?: string,
    @Query('status') status?: string,
    @Query('priority') priority?: string,
    @Query('page') page?: string,
    @Query('page_size') pageSize?: string,
    @Query('sort_by') sortBy?: string,
    @Query('sort_dir') sortDir?: string,
    @CurrentUser() user?: any,
  ) {
    // Ensure query parameters are strings, not arrays
    const qStr = Array.isArray(q) ? q[0] : q;
    const idStr = Array.isArray(id) ? id[0] : id;
    const dateFromStr = Array.isArray(dateFrom) ? dateFrom[0] : dateFrom;
    const dateToStr = Array.isArray(dateTo) ? dateTo[0] : dateTo;
    const categoryStr = Array.isArray(category) ? category[0] : category;
    const contractorIdStr = Array.isArray(contractorId) ? contractorId[0] : contractorId;
    const statusStr = Array.isArray(status) ? status[0] : status;
    const priorityStr = Array.isArray(priority) ? priority[0] : priority;
    const pageStr = Array.isArray(page) ? page[0] : page;
    const pageSizeStr = Array.isArray(pageSize) ? pageSize[0] : pageSize;
    const sortByStr = Array.isArray(sortBy) ? sortBy[0] : sortBy;
    const sortDirStr = Array.isArray(sortDir) ? sortDir[0] : sortDir;

    // Validate search query length
    if (qStr && qStr.length < 2) {
      throw new BadRequestException('Search query (q) must be at least 2 characters');
    }

    const userOrgIds = user.orgs?.map((o: any) => o.orgId) || [];
    const primaryRole = user.orgs?.[0]?.role || 'TENANT';
    
    return this.ticketsService.findMany(userOrgIds, primaryRole, { 
      q: qStr,
      id: idStr,
      dateFrom: dateFromStr,
      dateTo: dateToStr,
      category: categoryStr,
      contractorId: contractorIdStr,
      status: statusStr,
      priority: priorityStr,
      page: pageStr ? parseInt(pageStr, 10) : undefined,
      pageSize: pageSizeStr ? parseInt(pageSizeStr, 10) : undefined,
      sortBy: sortByStr || 'created_at',
      sortDir: (sortDirStr === 'asc' ? 'asc' : 'desc') as 'asc' | 'desc',
    });
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
    return this.ticketsService.approveQuote(quoteId, user.id, userOrgIds);
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
  @UseInterceptors(BulkResponseInterceptor)
  @ApiOperation({ 
    summary: 'Bulk assign tickets to contractor (OPS only)',
    description: 'Assign multiple tickets to a contractor at once. Limited to 50 tickets per request.'
  })
  @ApiResponse({ status: 200, description: 'All tickets assigned successfully' })
  @ApiResponse({ status: 207, description: 'Some tickets failed to assign' })
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

  @Roles('OPS')
  @Post('bulk/close')
  @UseInterceptors(BulkResponseInterceptor)
  @ApiOperation({ 
    summary: 'Bulk close tickets (OPS only)',
    description: 'Close multiple tickets at once with optional resolution note. Returns 207 Multi-Status with partial failure reporting.'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'All tickets closed successfully',
    schema: {
      example: {
        ok: ['t1', 't2', 't3'],
        failed: []
      }
    }
  })
  @ApiResponse({ 
    status: 207, 
    description: 'Some tickets failed to close',
    schema: {
      example: {
        ok: ['t1', 't2'],
        failed: [{ id: 't3', error: 'Already closed' }]
      }
    }
  })
  @ApiBearerAuth()
  async bulkClose(
    @Body() dto: BulkCloseDto,
    @CurrentUser() user: any,
    @Headers('idempotency-key') idempotencyKey?: string,
  ) {
    return this.ticketsService.bulkClose(
      dto.ticket_ids,
      user.id,
      user.orgs?.[0]?.role || 'TENANT',
      dto.resolution_note,
      idempotencyKey,
    );
  }

  @Roles('OPS')
  @Post('bulk/reassign')
  @UseInterceptors(BulkResponseInterceptor)
  @ApiOperation({ 
    summary: 'Bulk reassign tickets (OPS only)',
    description: 'Reassign multiple tickets to a new contractor. Returns 207 Multi-Status with partial failure reporting.'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'All tickets reassigned successfully',
    schema: {
      example: {
        ok: ['t1', 't2'],
        failed: []
      }
    }
  })
  @ApiResponse({ 
    status: 207, 
    description: 'Some tickets failed to reassign',
    schema: {
      example: {
        ok: ['t1'],
        failed: [{ id: 't2', error: 'Cannot reassign closed ticket' }]
      }
    }
  })
  @ApiBearerAuth()
  async bulkReassign(
    @Body() dto: BulkReassignDto,
    @CurrentUser() user: any,
    @Headers('idempotency-key') idempotencyKey?: string,
  ) {
    return this.ticketsService.bulkReassign(
      dto.ticket_ids,
      dto.contractor_id,
      user.id,
      user.orgs?.[0]?.role || 'TENANT',
      idempotencyKey,
    );
  }

  @Roles('OPS')
  @Post('bulk/tag')
  @UseInterceptors(BulkResponseInterceptor)
  @ApiOperation({ 
    summary: 'Bulk add/remove tags (OPS only)',
    description: 'Add or remove tags from multiple tickets. Returns 207 Multi-Status with partial failure reporting.'
  })
  @ApiResponse({ status: 200, description: 'All tickets tagged successfully' })
  @ApiResponse({ status: 207, description: 'Some tickets failed to tag' })
  @ApiBearerAuth()
  async bulkTag(
    @Body() dto: BulkTagDto,
    @CurrentUser() user: any,
    @Headers('idempotency-key') idempotencyKey?: string,
  ) {
    return this.ticketsService.bulkTag(
      dto.ticket_ids,
      user.id,
      user.orgs?.[0]?.role || 'TENANT',
      dto.add,
      dto.remove,
      idempotencyKey,
    );
  }

  @Roles('OPS')
  @Post('bulk/category')
  @UseInterceptors(BulkResponseInterceptor)
  @ApiOperation({ 
    summary: 'Bulk update category (OPS only)',
    description: 'Update category for multiple tickets. Returns 207 Multi-Status with partial failure reporting.'
  })
  @ApiResponse({ status: 200, description: 'All tickets categorized successfully' })
  @ApiResponse({ status: 207, description: 'Some tickets failed to categorize' })
  @ApiBearerAuth()
  async bulkCategory(
    @Body() dto: BulkCategoryDto,
    @CurrentUser() user: any,
    @Headers('idempotency-key') idempotencyKey?: string,
  ) {
    return this.ticketsService.bulkCategory(
      dto.ticket_ids,
      dto.category,
      user.id,
      user.orgs?.[0]?.role || 'TENANT',
      idempotencyKey,
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

  @Roles('LANDLORD')
  @Post('quotes/:quoteId/reject')
  @ApiOperation({ summary: 'Reject a quote' })
  @ApiBearerAuth()
  async rejectQuote(
    @Param('quoteId') quoteId: string,
    @Body() body: { reason?: string },
    @CurrentUser() user: any,
  ) {
    const userOrgIds = user.orgs?.map((o: any) => o.orgId) || [];
    return this.ticketsService.rejectQuote(quoteId, user.id, userOrgIds, body.reason);
  }

  @Roles('TENANT', 'LANDLORD', 'OPS', 'CONTRACTOR')
  @Post('appointments/:appointmentId/cancel')
  @ApiOperation({ summary: 'Cancel an appointment' })
  @ApiBearerAuth()
  async cancelAppointment(
    @Param('appointmentId') appointmentId: string,
    @Body() body: { cancellationNote?: string },
    @CurrentUser() user: any,
  ) {
    const primaryRole = user.orgs?.[0]?.role || 'TENANT';
    return this.ticketsService.cancelAppointment(
      appointmentId,
      user.id,
      primaryRole,
      body.cancellationNote,
    );
  }

  @Get(':id/quotes/compare')
  @ApiOperation({ summary: 'Compare quotes for a ticket' })
  @ApiBearerAuth()
  async compareQuotes(
    @Param('id') id: string,
    @CurrentUser() user: any,
  ) {
    const userOrgIds = user.orgs?.map((o: any) => o.orgId) || [];
    return this.ticketsService.compareQuotes(id, userOrgIds);
  }

  @Get('contractors/:contractorId/availability')
  @ApiOperation({ summary: 'Check contractor availability' })
  @ApiQuery({ name: 'startAt', required: true, description: 'Proposed start time (ISO 8601)' })
  @ApiQuery({ name: 'endAt', required: true, description: 'Proposed end time (ISO 8601)' })
  @ApiBearerAuth()
  async checkContractorAvailability(
    @Param('contractorId') contractorId: string,
    @Query('startAt') startAt: string,
    @Query('endAt') endAt: string,
  ) {
    return this.ticketsService.checkContractorAvailability(
      contractorId,
      new Date(startAt),
      new Date(endAt),
    );
  }

  @Roles('OPS', 'LANDLORD')
  @Post(':id/reopen')
  @ApiOperation({ summary: 'Reopen a closed ticket' })
  @ApiBearerAuth()
  async reopenTicket(
    @Param('id') id: string,
    @Body() body: { reason: string },
    @CurrentUser() user: any,
  ) {
    const userOrgIds = user.orgs?.map((o: any) => o.orgId) || [];
    return this.ticketsService.reopenTicket(id, user.id, userOrgIds, body.reason);
  }

  @Roles('LANDLORD')
  @Post('quotes/bulk/approve')
  @ApiOperation({ summary: 'Bulk approve quotes' })
  @ApiBearerAuth()
  async bulkApproveQuotes(
    @Body() body: { quoteIds: string[] },
    @CurrentUser() user: any,
  ) {
    const userOrgIds = user.orgs?.map((o: any) => o.orgId) || [];
    return this.ticketsService.bulkApproveQuotes(body.quoteIds, user.id, userOrgIds);
  }

  @Roles('LANDLORD')
  @Post('templates')
  @ApiOperation({ summary: 'Create a ticket template' })
  @ApiBearerAuth()
  async createTemplate(
    @Body() body: {
      title: string;
      description: string;
      category?: string;
      priority?: string;
      tags?: string[];
    },
    @CurrentUser() user: any,
  ) {
    const landlordId = user.orgs?.[0]?.orgId;
    if (!landlordId) {
      throw new BadRequestException('User must belong to a landlord organization');
    }
    return this.ticketsService.createTemplate(
      landlordId,
      body.title,
      body.description,
      body.category,
      body.priority,
      body.tags,
    );
  }

  @Roles('LANDLORD')
  @Get('templates')
  @ApiOperation({ summary: 'Get ticket templates for landlord' })
  @ApiBearerAuth()
  async getTemplates(@CurrentUser() user: any) {
    const landlordId = user.orgs?.[0]?.orgId;
    if (!landlordId) {
      throw new BadRequestException('User must belong to a landlord organization');
    }
    return this.ticketsService.getTemplates(landlordId);
  }

  @Roles('LANDLORD')
  @Post('templates/:templateId/create-ticket')
  @ApiOperation({ summary: 'Create ticket from template' })
  @ApiBearerAuth()
  async createFromTemplate(
    @Param('templateId') templateId: string,
    @Body() body: { propertyId: string; tenancyId?: string },
    @CurrentUser() user: any,
  ) {
    const userOrgIds = user.orgs?.map((o: any) => o.orgId) || [];
    const landlordId = user.orgs?.[0]?.orgId;
    if (!landlordId) {
      throw new BadRequestException('User must belong to a landlord organization');
    }
    return this.ticketsService.createFromTemplate(
      templateId,
      landlordId,
      body.propertyId,
      body.tenancyId,
      user.id,
      userOrgIds,
    );
  }

  @Post(':id/comments')
  @ApiOperation({ summary: 'Add comment to ticket' })
  @ApiBearerAuth()
  async addComment(
    @Param('id') id: string,
    @Body() body: { content: string; parentId?: string },
    @CurrentUser() user: any,
  ) {
    const userOrgIds = user.orgs?.map((o: any) => o.orgId) || [];
    return this.ticketsService.addComment(id, user.id, userOrgIds, body.content, body.parentId);
  }

  @Get(':id/comments')
  @ApiOperation({ summary: 'Get comments for a ticket' })
  @ApiBearerAuth()
  async getComments(
    @Param('id') id: string,
    @CurrentUser() user: any,
  ) {
    const userOrgIds = user.orgs?.map((o: any) => o.orgId) || [];
    return this.ticketsService.getComments(id, userOrgIds);
  }

  @Get('contractors/:contractorId/metrics')
  @ApiOperation({ summary: 'Get contractor performance metrics' })
  @ApiQuery({ name: 'periodDays', required: false, description: 'Period in days (default: 30)' })
  @ApiBearerAuth()
  async getContractorMetrics(
    @Param('contractorId') contractorId: string,
    @Query('periodDays') periodDays?: string,
  ) {
    const days = periodDays ? parseInt(periodDays, 10) : 30;
    return this.ticketsService.getContractorMetrics(contractorId, days);
  }

  @Roles('LANDLORD')
  @Post('category-routing')
  @ApiOperation({ summary: 'Create or update category routing rule' })
  @ApiBearerAuth()
  async upsertCategoryRoutingRule(
    @Body() body: {
      category: string;
      contractorId?: string | null;
      priority?: string;
    },
    @CurrentUser() user: any,
  ) {
    const landlordId = user.orgs?.[0]?.orgId;
    if (!landlordId) {
      throw new BadRequestException('User must belong to a landlord organization');
    }
    return this.ticketsService.upsertCategoryRoutingRule(
      landlordId,
      body.category,
      body.contractorId || null,
      body.priority || 'STANDARD',
    );
  }

  @Roles('LANDLORD')
  @Get('category-routing')
  @ApiOperation({ summary: 'Get category routing rules' })
  @ApiBearerAuth()
  async getCategoryRoutingRules(@CurrentUser() user: any) {
    const landlordId = user.orgs?.[0]?.orgId;
    if (!landlordId) {
      throw new BadRequestException('User must belong to a landlord organization');
    }
    return this.ticketsService.getCategoryRoutingRules(landlordId);
  }

  @Roles('CONTRACTOR')
  @Patch('quotes/:quoteId/actual-cost')
  @ApiOperation({ summary: 'Update quote with actual cost' })
  @ApiBearerAuth()
  async updateQuoteActualCost(
    @Param('quoteId') quoteId: string,
    @Body() body: { actualAmount: number },
    @CurrentUser() user: any,
  ) {
    return this.ticketsService.updateQuoteActualCost(quoteId, user.id, body.actualAmount);
  }

  @Get('export/csv')
  @ApiOperation({ summary: 'Export tickets to CSV' })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'category', required: false })
  @ApiQuery({ name: 'date_from', required: false })
  @ApiQuery({ name: 'date_to', required: false })
  @ApiBearerAuth()
  async exportTickets(
    @Query('status') status?: string,
    @Query('category') category?: string,
    @Query('date_from') dateFrom?: string,
    @Query('date_to') dateTo?: string,
    @CurrentUser() user?: any,
  ) {
    const userOrgIds = user.orgs?.map((o: any) => o.orgId) || [];
    const primaryRole = user.orgs?.[0]?.role || 'TENANT';
    
    const csv = await this.ticketsService.exportTickets(userOrgIds, primaryRole, {
      status,
      category,
      dateFrom,
      dateTo,
    });

    return csv;
  }

  @Get('reports/summary')
  @ApiOperation({ summary: 'Get ticket summary report' })
  @ApiQuery({ name: 'period', required: false, enum: ['day', 'week', 'month', 'year'], description: 'Report period (default: month)' })
  @ApiBearerAuth()
  async getTicketReport(
    @Query('period') period?: 'day' | 'week' | 'month' | 'year',
    @CurrentUser() user?: any,
  ) {
    const userOrgIds = user.orgs?.map((o: any) => o.orgId) || [];
    const primaryRole = user.orgs?.[0]?.role || 'TENANT';
    
    return this.ticketsService.getTicketReport(userOrgIds, primaryRole, period || 'month');
  }
}
