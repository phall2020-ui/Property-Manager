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
import { TicketsService } from './tickets.service';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { CreateQuoteDto } from './dto/create-quote.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { diskStorage } from 'multer';
import { extname } from 'path';

@ApiTags('tickets')
@Controller('tickets')
export class TicketsController {
  constructor(private readonly ticketsService: TicketsService) {}

  @Roles('TENANT')
  @Post()
  @ApiOperation({ summary: 'Create a maintenance ticket' })
  @ApiBearerAuth()
  async create(@Body() dto: CreateTicketDto, @CurrentUser() user: any) {
    return this.ticketsService.create({
      ...dto,
      createdById: user.sub,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get ticket by ID' })
  @ApiBearerAuth()
  async findOne(@Param('id') id: string, @CurrentUser() user: any) {
    const userOrgIds = user.orgs?.map((o: any) => o.orgId) || [];
    return this.ticketsService.findOne(id, userOrgIds);
  }

  @Get()
  @ApiOperation({ summary: 'List tickets' })
  @ApiBearerAuth()
  async findMany(@CurrentUser() user: any) {
    const userOrgIds = user.orgs?.map((o: any) => o.orgId) || [];
    const primaryRole = user.orgs?.[0]?.role || 'TENANT';
    return this.ticketsService.findMany(userOrgIds, primaryRole);
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
    return this.ticketsService.createQuote(id, user.sub, dto.amount, dto.notes);
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
    return this.ticketsService.completeTicket(id, user.sub, body.completionNotes);
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
}
