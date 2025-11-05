import { Body, Controller, Get, Param, Patch, Post, Query, Headers } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { UpdateTicketStatusDto } from './dto/update-ticket-status.dto';
import { QuoteDto } from './dto/quote.dto';
import { TicketsService } from './tickets.service';

@ApiTags('tickets')
@Controller('tickets')
export class TicketsController {
  constructor(private readonly ticketsService: TicketsService) {}

  @Roles('TENANT')
  @Post()
  @ApiOperation({ summary: 'Create a new maintenance ticket' })
  @ApiBearerAuth()
  async create(
    @Body() dto: CreateTicketDto,
    @CurrentUser() user: any,
    @Headers('idempotency-key') idempotencyKey?: string,
  ) {
    return this.ticketsService.create({ ...dto, createdById: user.id, idempotencyKey });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get ticket by ID' })
  @ApiBearerAuth()
  async findOne(@Param('id') id: string, @CurrentUser() user: any) {
    return this.ticketsService.findOne(id, user);
  }

  @Get()
  @ApiOperation({ summary: 'List tickets' })
  @ApiBearerAuth()
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'propertyId', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async findMany(
    @Query('status') status?: string,
    @Query('propertyId') propertyId?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @CurrentUser() user?: any,
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 20;
    return this.ticketsService.findMany(user, { status, propertyId, page: pageNum, limit: limitNum });
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Update ticket status' })
  @ApiBearerAuth()
  async updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateTicketStatusDto,
    @CurrentUser() user: any,
  ) {
    return this.ticketsService.updateStatus(id, dto.status, user);
  }

  @Roles('CONTRACTOR')
  @Post(':id/quote')
  @ApiOperation({ summary: 'Submit a quote for a ticket' })
  @ApiBearerAuth()
  async quote(@Param('id') id: string, @Body() dto: QuoteDto, @CurrentUser() user: any) {
    return this.ticketsService.submitQuote(id, dto.amount, user);
  }

  @Roles('LANDLORD')
  @Post(':id/approve')
  @ApiOperation({ summary: 'Approve a quoted ticket' })
  @ApiBearerAuth()
  async approve(@Param('id') id: string, @CurrentUser() user: any) {
    return this.ticketsService.approve(id, user);
  }
}