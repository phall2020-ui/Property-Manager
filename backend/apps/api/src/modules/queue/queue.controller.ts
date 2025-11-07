import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

@ApiTags('queue')
@Controller('queue')
@ApiBearerAuth()
export class QueueController {
  constructor(
    @InjectQueue('tickets') private ticketsQueue: Queue,
    @InjectQueue('notifications') private notificationsQueue: Queue,
    @InjectQueue('dead-letter') private deadLetterQueue: Queue,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List all queue items' })
  async listQueueItems() {
    try {
      const queues = [
        { name: 'tickets', queue: this.ticketsQueue },
        { name: 'notifications', queue: this.notificationsQueue },
        { name: 'dead-letter', queue: this.deadLetterQueue },
      ];

      const allItems = [];

      for (const { name: queueName, queue } of queues) {
        const [waiting, active, delayed] = await Promise.all([
          queue.getWaiting(),
          queue.getActive(),
          queue.getDelayed(),
        ]);

        const items = [...waiting, ...active, ...delayed];
        
        for (const job of items) {
          allItems.push({
            id: job.id,
            queue: queueName,
            name: job.name,
            status: await job.getState(),
            priority: job.opts.priority || 0,
            data: job.data,
            createdAt: new Date(job.timestamp).toISOString(),
            processedAt: job.processedOn ? new Date(job.processedOn).toISOString() : null,
          });
        }
      }

      // Sort by priority (descending) then creation date (descending)
      allItems.sort((a, b) => {
        if (b.priority !== a.priority) {
          return b.priority - a.priority;
        }
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });

      return allItems;
    } catch (error) {
      console.warn('Queue listing failed - Redis may not be available:', error.message);
      return [];
    }
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get queue statistics' })
  async getQueueStats() {
    try {
      const queues = [
        { name: 'tickets', queue: this.ticketsQueue },
        { name: 'notifications', queue: this.notificationsQueue },
        { name: 'dead-letter', queue: this.deadLetterQueue },
      ];

      let totalWaiting = 0;
      let totalActive = 0;
      let totalCompleted = 0;
      let totalFailed = 0;
      let totalDelayed = 0;

      for (const { queue } of queues) {
        const counts = await queue.getJobCounts(
          'waiting',
          'active',
          'completed',
          'failed',
          'delayed',
        );
        
        totalWaiting += counts.waiting || 0;
        totalActive += counts.active || 0;
        totalCompleted += counts.completed || 0;
        totalFailed += counts.failed || 0;
        totalDelayed += counts.delayed || 0;
      }

      return {
        waiting: totalWaiting,
        active: totalActive,
        completed: totalCompleted,
        failed: totalFailed,
        delayed: totalDelayed,
      };
    } catch (error) {
      console.warn('Queue stats failed - Redis may not be available:', error.message);
      return {
        waiting: 0,
        active: 0,
        completed: 0,
        failed: 0,
        delayed: 0,
      };
    }
  }
}
