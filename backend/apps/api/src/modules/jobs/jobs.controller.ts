import { Controller, Get, Param } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

@ApiTags('jobs')
@Controller('jobs')
@ApiBearerAuth()
export class JobsController {
  constructor(
    @InjectQueue('tickets') private ticketsQueue: Queue,
    @InjectQueue('notifications') private notificationsQueue: Queue,
  ) {}

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
      console.warn('Jobs listing failed - Redis may not be available:', error.message);
      return [];
    }
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get job details by ID' })
  async getJob(@Param('id') id: string) {
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
      console.warn('Job retrieval failed:', error.message);
      return null;
    }
  }
}
