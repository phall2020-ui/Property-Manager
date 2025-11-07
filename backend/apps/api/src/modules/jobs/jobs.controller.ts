import { 
  Controller, 
  Get, 
  Post, 
  Param, 
  Query, 
  Body, 
  UseGuards, 
  Request,
  HttpCode,
  HttpStatus,
  NotFoundException,
  BadRequestException
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags, ApiQuery, ApiParam } from '@nestjs/swagger';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { Logger } from '@nestjs/common';
import { JobsService } from './jobs.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AuthGuard } from '../../common/guards/auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('jobs')
@Controller('jobs')
@ApiBearerAuth()
@UseGuards(AuthGuard, RolesGuard)
export class JobsController {
  private readonly logger = new Logger(JobsController.name);

  constructor(
    private readonly jobsService: JobsService,
    private readonly prisma: PrismaService,
    @InjectQueue('tickets') private ticketsQueue: Queue,
    @InjectQueue('notifications') private notificationsQueue: Queue,
  ) {}

  @Get('queues')
  @Roles('ADMIN', 'OPS')
  @ApiOperation({ summary: 'List all queues with counts (admin/ops only)' })
  async getQueues() {
    try {
      return await this.jobsService.getQueues();
    } catch (error) {
      this.logger.error('Failed to get queues', error.message);
      throw new BadRequestException(error.message);
    }
  }

  @Get('queues/:queueName')
  @Roles('ADMIN', 'OPS')
  @ApiOperation({ summary: 'Get queue statistics (admin/ops only)' })
  @ApiParam({ name: 'queueName', enum: ['tickets', 'notifications', 'dead-letter'] })
  @ApiQuery({ name: 'status', required: false, enum: ['waiting', 'active', 'delayed', 'completed', 'failed'] })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'pageSize', required: false, type: Number })
  async getQueue(
    @Param('queueName') queueName: string,
    @Query('status') status?: 'waiting' | 'active' | 'delayed' | 'completed' | 'failed',
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    try {
      const queueStats = await this.jobsService.getQueue(queueName);
      
      if (status) {
        const pageNum = page ? parseInt(page, 10) : 1;
        const pageSizeNum = pageSize ? parseInt(pageSize, 10) : 25;
        const jobs = await this.jobsService.listJobs(queueName, status, pageNum, pageSizeNum);
        
        return {
          ...queueStats,
          jobs,
          pagination: {
            page: pageNum,
            pageSize: pageSizeNum,
          },
        };
      }
      
      return queueStats;
    } catch (error) {
      this.logger.error(`Failed to get queue ${queueName}`, error.message);
      throw new BadRequestException(error.message);
    }
  }

  @Get('queues/:queueName/:jobId')
  @Roles('ADMIN', 'OPS')
  @ApiOperation({ summary: 'Get job details (admin/ops only)' })
  @ApiParam({ name: 'queueName', enum: ['tickets', 'notifications', 'dead-letter'] })
  async getJob(
    @Param('queueName') queueName: string,
    @Param('jobId') jobId: string,
  ) {
    try {
      const job = await this.jobsService.getJob(queueName, jobId);
      if (!job) {
        throw new NotFoundException(`Job ${jobId} not found in queue ${queueName}`);
      }
      return job;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Failed to get job ${jobId}`, error.message);
      throw new BadRequestException(error.message);
    }
  }

  @Post('queues/:queueName/:jobId/retry')
  @Roles('ADMIN', 'OPS')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Retry a failed job (admin/ops only)' })
  @ApiParam({ name: 'queueName', enum: ['tickets', 'notifications', 'dead-letter'] })
  async retryJob(
    @Param('queueName') queueName: string,
    @Param('jobId') jobId: string,
    @Body() body: { reason?: string },
    @Request() req: any,
  ) {
    try {
      const result = await this.jobsService.retryJob(queueName, jobId);
      
      // Create audit log
      await this.prisma.jobAudit.create({
        data: {
          queue: queueName,
          jobId,
          action: 'retry',
          actorUserId: req.user.id,
          reason: body.reason || null,
        },
      });
      
      this.logger.log(`User ${req.user.id} retried job ${jobId} in queue ${queueName}`);
      return result;
    } catch (error) {
      this.logger.error(`Failed to retry job ${jobId}`, error.message);
      throw new BadRequestException(error.message);
    }
  }

  @Post('queues/:queueName/:jobId/remove')
  @Roles('ADMIN', 'OPS')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove a job from the queue (admin/ops only)' })
  @ApiParam({ name: 'queueName', enum: ['tickets', 'notifications', 'dead-letter'] })
  async removeJob(
    @Param('queueName') queueName: string,
    @Param('jobId') jobId: string,
    @Body() body: { reason?: string },
    @Request() req: any,
  ) {
    try {
      const result = await this.jobsService.removeJob(queueName, jobId);
      
      // Create audit log
      await this.prisma.jobAudit.create({
        data: {
          queue: queueName,
          jobId,
          action: 'remove',
          actorUserId: req.user.id,
          reason: body.reason || null,
        },
      });
      
      this.logger.log(`User ${req.user.id} removed job ${jobId} from queue ${queueName}`);
      return result;
    } catch (error) {
      this.logger.error(`Failed to remove job ${jobId}`, error.message);
      throw new BadRequestException(error.message);
    }
  }

  @Post('queues/:queueName/:jobId/cancel')
  @Roles('ADMIN', 'OPS')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancel a job (admin/ops only)' })
  @ApiParam({ name: 'queueName', enum: ['tickets', 'notifications', 'dead-letter'] })
  async cancelJob(
    @Param('queueName') queueName: string,
    @Param('jobId') jobId: string,
    @Body() body: { reason?: string },
    @Request() req: any,
  ) {
    try {
      const result = await this.jobsService.failJob(
        queueName, 
        jobId, 
        body.reason || 'Manually cancelled'
      );
      
      // Create audit log
      await this.prisma.jobAudit.create({
        data: {
          queue: queueName,
          jobId,
          action: 'cancel',
          actorUserId: req.user.id,
          reason: body.reason || null,
        },
      });
      
      this.logger.log(`User ${req.user.id} cancelled job ${jobId} in queue ${queueName}`);
      return result;
    } catch (error) {
      this.logger.error(`Failed to cancel job ${jobId}`, error.message);
      throw new BadRequestException(error.message);
    }
  }

  @Get('audit')
  @Roles('ADMIN', 'OPS')
  @ApiOperation({ summary: 'Get job audit logs (admin/ops only)' })
  @ApiQuery({ name: 'queue', required: false })
  @ApiQuery({ name: 'jobId', required: false })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'pageSize', required: false, type: Number })
  async getAuditLogs(
    @Query('queue') queue?: string,
    @Query('jobId') jobId?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const pageSizeNum = pageSize ? parseInt(pageSize, 10) : 25;
    const skip = (pageNum - 1) * pageSizeNum;

    const where: any = {};
    if (queue) where.queue = queue;
    if (jobId) where.jobId = jobId;

    const [logs, total] = await Promise.all([
      this.prisma.jobAudit.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSizeNum,
      }),
      this.prisma.jobAudit.count({ where }),
    ]);

    return {
      data: logs,
      pagination: {
        page: pageNum,
        pageSize: pageSizeNum,
        total,
        totalPages: Math.ceil(total / pageSizeNum),
      },
    };
  }

  // Legacy endpoint - keep for backward compatibility
  @Get()
  @ApiOperation({ summary: 'List all jobs across all queues' })
  async listJobs() {
    try {
      const queues = [
        { name: 'tickets', queue: this.ticketsQueue },
        { name: 'notifications', queue: this.notificationsQueue },
      ];

      const allJobs = [];

      for (const { name: queueName, queue } of queues) {
        const [waiting, active, completed, failed, delayed] = await Promise.all([
          queue.getWaiting(),
          queue.getActive(),
          queue.getCompleted(0, 50), // Get last 50 completed
          queue.getFailed(0, 50), // Get last 50 failed
          queue.getDelayed(),
        ]);

        const jobs = [...waiting, ...active, ...completed, ...failed, ...delayed];
        
        for (const job of jobs) {
          allJobs.push({
            id: job.id,
            name: job.name,
            queue: queueName,
            status: await job.getState(),
            data: job.data,
            createdAt: new Date(job.timestamp).toISOString(),
            completedAt: job.finishedOn ? new Date(job.finishedOn).toISOString() : null,
            failedReason: job.failedReason,
          });
        }
      }

      // Sort by creation date descending
      allJobs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      return allJobs;
    } catch (error) {
      // If Redis is not available, return empty array
      this.logger.warn('Jobs listing failed - Redis may not be available', error.message);
      return [];
    }
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get job details by ID' })
  async getJobById(@Param('id') id: string) {
    try {
      const queues = [this.ticketsQueue, this.notificationsQueue];

      for (const queue of queues) {
        const job = await queue.getJob(id);
        if (job) {
          return {
            id: job.id,
            name: job.name,
            status: await job.getState(),
            data: job.data,
            progress: job.progress,
            createdAt: new Date(job.timestamp).toISOString(),
            processedAt: job.processedOn ? new Date(job.processedOn).toISOString() : null,
            completedAt: job.finishedOn ? new Date(job.finishedOn).toISOString() : null,
            failedReason: job.failedReason,
            stacktrace: job.stacktrace,
            returnvalue: job.returnvalue,
          };
        }
      }

      return null;
    } catch (error) {
      this.logger.warn('Job retrieval failed', error.message);
      return null;
    }
  }
}
