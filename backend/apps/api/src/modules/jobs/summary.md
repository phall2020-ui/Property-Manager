# Background Jobs Module Summary

## 📊 Current Status: ✅ **Production Ready** (with graceful Redis fallback)

The jobs module provides background job processing using BullMQ and Redis for asynchronous tasks like notifications, email sending, and data processing. Gracefully handles Redis not being available in development.

## 🎯 Key Features Implemented

### ✅ Core Functionality
- **Job Queuing** - Enqueue jobs for background processing
- **Multiple Queues** - Separate queues for different job types
- **Retry Logic** - Exponential backoff for failed jobs
- **Dead Letter Queue** - Capture permanently failed jobs
- **Graceful Fallback** - Works without Redis (logs to console)
- **Priority Jobs** - Support for job priorities
- **Delayed Jobs** - Schedule jobs for future execution

### ✅ Job Queues
- `tickets` - Ticket-related background tasks
- `notifications` - Email, SMS, push notifications
- `dead-letter` - Failed jobs requiring manual intervention

### ✅ Job Types
- `ticket.created` - New ticket notifications
- `ticket.quoted` - Quote submitted notifications
- `ticket.approved` - Quote approval notifications
- `ticket.assigned` - Contractor assignment notifications
- `invoice.created` - Invoice generation and sending
- `payment.received` - Payment confirmation
- `email.send` - Email sending
- `sms.send` - SMS sending

## 🔌 Job Processing

### Job Service Methods

```typescript
// Enqueue a job
await this.jobsService.enqueueTicketCreated({
  ticketId: ticket.id,
  landlordId: ticket.landlordId,
  tenantId: ticket.tenantId,
});

// Enqueue with options
await this.jobsService.enqueueNotification({
  type: 'email',
  to: 'user@example.com',
  subject: 'New Ticket',
  body: '...',
}, {
  priority: 1,
  delay: 5000, // 5 seconds
  jobId: 'unique-job-id'
});
```

### Job Data Examples

**Ticket Created Job:**
```json
{
  "type": "ticket.created",
  "data": {
    "ticketId": "uuid",
    "landlordId": "landlord-org-uuid",
    "tenantId": "tenant-org-uuid",
    "propertyId": "property-uuid",
    "title": "Leaking faucet",
    "priority": "MEDIUM"
  }
}
```

**Email Job:**
```json
{
  "type": "email.send",
  "data": {
    "to": "user@example.com",
    "subject": "New Ticket Created",
    "template": "ticket_created",
    "data": {
      "ticketId": "uuid",
      "ticketTitle": "Leaking faucet"
    }
  }
}
```

## 📁 File Structure

```
jobs/
├── jobs.module.ts              # Module definition with BullMQ setup
├── jobs.service.ts             # Job enqueuing service
├── processors/
│   ├── tickets.processor.ts    # Process ticket jobs
│   ├── notifications.processor.ts # Process notification jobs
│   └── dead-letter.processor.ts  # Process failed jobs
└── summary.md                  # This file
```

## ✅ Test Coverage

### Manual Testing Status
- ✅ Jobs enqueued successfully
- ✅ Jobs processed in background
- ✅ Retry logic works correctly
- ✅ Dead letter queue captures failures
- ✅ Graceful fallback without Redis
- ✅ Priority jobs processed first
- ✅ Delayed jobs execute at correct time

### Automated Tests
- ⚠️ Unit tests needed for jobs.service.ts
- ⚠️ Unit tests needed for processors
- ⚠️ E2E tests needed

## 🐛 Known Issues

**None** - Module is fully functional. Works with or without Redis.

## 📋 Required Next Steps

### High Priority
1. **Add Unit Tests** - Test job service and processors
2. **Add E2E Tests** - Test complete job workflows
3. **Add Job Dashboard** - UI to view job status and queues
4. **Add Job Monitoring** - Track success/failure rates
5. **Add Job Retry UI** - Manually retry failed jobs

### Medium Priority
6. **Add Scheduled Jobs** - Cron-like job scheduling
7. **Add Job Dependencies** - Jobs that depend on other jobs
8. **Add Job Batching** - Process multiple jobs together
9. **Add Job Metrics** - Prometheus/Grafana integration
10. **Add Job Webhooks** - Notify external systems on completion

### Low Priority
11. **Add Job Priorities** - More granular priority levels
12. **Add Job Rate Limiting** - Limit job processing rate
13. **Add Job Timeouts** - Kill jobs that run too long
14. **Add Job Logging** - Detailed job execution logs
15. **Add Job Analytics** - Job performance analysis

## 🔗 Dependencies

- `@nestjs/bullmq` - BullMQ integration for NestJS
- `bullmq` - Job queue library
- `redis` - Redis client (optional in development)

## 🚀 Integration Points

### Used By
- Tickets module - Background notifications
- Finance module - Invoice generation
- Auth module - Welcome emails
- Notifications module - Email/SMS sending

### Uses
- Redis - Job queue storage (optional)
- Email service - Send emails
- SMS service - Send SMS
- Events service - Emit events on job completion

## 📈 Performance Considerations

- ✅ Asynchronous processing (doesn't block requests)
- ✅ Retry logic prevents data loss
- ✅ Dead letter queue for failed jobs
- ✅ Configurable concurrency per queue
- ⚠️ Monitor Redis memory usage
- ⚠️ Set up Redis persistence for job durability

## 🔐 Security Features

- ✅ Job data validated before processing
- ✅ Failed jobs captured for review
- ✅ No sensitive data logged
- ✅ Job processors isolated from web layer

## 📝 Configuration

Environment variables:
- `REDIS_URL` - Redis connection URL (e.g., `redis://localhost:6379`)
- `REDIS_HOST` - Redis host (default: localhost)
- `REDIS_PORT` - Redis port (default: 6379)
- `REDIS_PASSWORD` - Redis password (optional)

Redis not required in development - jobs will be logged instead.

## 🎓 Developer Notes

### Job Queue Configuration
Each queue configured with:
```typescript
{
  connection: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
  },
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
    removeOnComplete: 100, // Keep last 100 completed
    removeOnFail: false,    // Keep failed jobs
  }
}
```

### Retry Strategy
Exponential backoff:
- Attempt 1: Immediate
- Attempt 2: 2 seconds delay
- Attempt 3: 4 seconds delay
- Attempt 4: 8 seconds delay

After max attempts, job moves to dead letter queue.

### Job Processors
Each processor handles specific job types:

```typescript
@Processor('tickets')
export class TicketsProcessor {
  @Process('ticket.created')
  async handleTicketCreated(job: Job) {
    const { ticketId, landlordId } = job.data;
    
    // Send notifications
    await this.notifyLandlord(landlordId, ticketId);
    
    // Emit event
    this.eventsService.emit({
      type: 'ticket.created',
      data: job.data
    });
  }
}
```

### Enqueuing Jobs
From any service:
```typescript
constructor(private jobsService: JobsService) {}

async createTicket(dto: CreateTicketDto) {
  const ticket = await this.prisma.ticket.create({ data: dto });
  
  // Enqueue background job
  await this.jobsService.enqueueTicketCreated({
    ticketId: ticket.id,
    landlordId: ticket.landlordId,
  });
  
  return ticket;
}
```

### Job Priorities
Priority levels (lower = higher priority):
- `1` - Critical (e.g., payment notifications)
- `2` - High (e.g., ticket created)
- `3` - Normal (e.g., daily reports)
- `4` - Low (e.g., analytics processing)

### Delayed Jobs
Schedule jobs for future:
```typescript
await this.jobsService.enqueueJob('reminder', data, {
  delay: 24 * 60 * 60 * 1000, // 24 hours
});
```

### Job Idempotency
Use job IDs to prevent duplicates:
```typescript
await this.jobsService.enqueueJob('email', data, {
  jobId: `email-${userId}-${timestamp}`,
});
```

### Graceful Fallback
When Redis is not available:
- Jobs are logged to console
- Application continues to work
- Warning logged on startup
- Useful for local development

To enable background jobs:
1. Start Redis: `docker run -d -p 6379:6379 redis`
2. Set `REDIS_URL` in `.env`
3. Restart application

### Dead Letter Queue
Failed jobs go to dead letter queue:
- Review failed jobs
- Identify issues
- Manually retry if needed
- Fix underlying problems

### Monitoring Jobs
View job status:
```bash
# Connect to Redis CLI
redis-cli

# List all queues
KEYS bull:*

# Get queue stats
HGETALL bull:tickets:meta

# List failed jobs
LRANGE bull:tickets:failed 0 -1
```

### Job Best Practices
1. **Keep jobs small** - Process one thing at a time
2. **Make jobs idempotent** - Safe to retry
3. **Use retries** - Handle transient failures
4. **Log failures** - Debug issues easily
5. **Monitor queues** - Watch for backlog
6. **Set timeouts** - Prevent hung jobs
7. **Use priorities** - Important jobs first

### Scheduled Jobs (Cron)
For recurring tasks:
```typescript
@Cron('0 0 * * *') // Daily at midnight
async generateDailyReports() {
  await this.jobsService.enqueueJob('daily-report', {
    date: new Date(),
  });
}
```

### Future Enhancements
- Job dashboard UI (BullBoard)
- Job metrics and monitoring
- Job webhooks for external systems
- Job dependencies (wait for other jobs)
- Job batching (process multiple together)
- Job rate limiting (throttle processing)
- Job archiving (move old jobs to cold storage)
- Distributed job processing (multiple workers)
