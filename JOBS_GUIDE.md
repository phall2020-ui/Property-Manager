# Jobs Queue Management System

## Overview

The Property Management platform includes a comprehensive background job processing system built with **BullMQ** and **Redis**. This system handles asynchronous tasks such as:

- Ticket lifecycle notifications
- Email and SMS notifications
- Scheduled appointment auto-transitions
- Dead letter queue for failed jobs

## Architecture

### Backend (NestJS + BullMQ)

- **JobsModule**: Global module that manages all job queues
- **JobsService**: Service for enqueuing and managing jobs
- **JobsController**: REST API endpoints for queue management
- **Processors**: Worker processes that handle job execution

### Queues

1. **tickets**: Handles ticket-related jobs (created, quoted, approved, assigned, appointment start)
2. **notifications**: Handles notification delivery (email, SMS, push)
3. **dead-letter**: Stores failed jobs for manual inspection

### Frontend (Next.js)

- **Jobs Dashboard** (`/job-queues`): Overview of all queues with real-time statistics
- **Queue Detail** (`/job-queues/[id]`): Detailed view of jobs in a specific queue
- **Job Actions**: Retry, remove, or cancel failed jobs
- **Audit Logging**: Track all manual job actions

## Getting Started

### Prerequisites

1. **Redis** must be running for job processing
2. **Backend** must be configured with `REDIS_URL` environment variable
3. **User** must have `ADMIN` or `OPS` role to access job management UI

### Running Redis

#### Using Docker

```bash
docker run -d -p 6379:6379 redis:7-alpine
```

#### Using Docker Compose

```bash
docker-compose up redis
```

For testing:

```bash
docker-compose -f docker-compose.test.yml up redis
```

### Configuration

Add to your `.env` file:

```env
# Redis Connection
REDIS_URL=redis://localhost:6379

# Job UI Configuration
JOB_UI_PAGE_SIZE=25
```

### Starting the Services

#### Backend

```bash
cd backend
npm install
npm run dev
```

The API will be available at `http://localhost:4000`

#### Frontend

```bash
cd frontend
npm install
npm run dev
```

The UI will be available at `http://localhost:3000`

## Using the Jobs Dashboard

### Accessing the Dashboard

1. Log in with an `ADMIN` or `OPS` user account
2. Navigate to **Job Queues** from the ops navigation menu
3. Or visit directly: `http://localhost:3000/job-queues`

### Queue Overview

The dashboard displays all queues with:
- **Waiting**: Jobs waiting to be processed
- **Active**: Jobs currently being processed
- **Delayed**: Jobs scheduled for future processing
- **Failed**: Jobs that failed execution
- **Completed**: Successfully completed jobs (count only)

### Queue Detail View

Click on any queue to see detailed job information:

- **Status Tabs**: Filter jobs by status (waiting, active, delayed, completed, failed)
- **Job Table**: View job ID, name, status, progress, attempts, and creation time
- **Pagination**: Browse through jobs (25 per page by default)
- **Auto-refresh**: Jobs list refreshes every 5 seconds

### Job Actions

For failed jobs, you can:

1. **Retry**: Re-queue the job for processing
   - Click "Retry" button next to the failed job
   - Optionally provide a reason
   - Job moves back to waiting queue

2. **Remove**: Delete the job from the queue
   - Click "Remove" button next to the job
   - Optionally provide a reason
   - Job is permanently removed

3. **View Details**: See full job information
   - Click "View" to open job detail drawer
   - Inspect job data, error messages, and stack traces

### Audit Logging

All manual job actions (retry, remove, cancel) are logged to the `JobAudit` table:
- Actor user ID
- Queue name
- Job ID
- Action type
- Optional reason
- Timestamp

Access audit logs via API: `GET /jobs/audit`

## API Endpoints

### Queue Management

```
GET    /jobs/queues                    # List all queues with counts
GET    /jobs/queues/:queueName         # Get queue stats and jobs
GET    /jobs/queues/:queueName/:jobId  # Get job details
POST   /jobs/queues/:queueName/:jobId/retry   # Retry failed job
POST   /jobs/queues/:queueName/:jobId/remove  # Remove job
POST   /jobs/queues/:queueName/:jobId/cancel  # Cancel job
GET    /jobs/audit                     # Get audit logs
```

### Health Check

```
GET    /health                         # Includes Redis connectivity status
```

All endpoints require authentication and `ADMIN` or `OPS` role.

## Testing

### Unit Tests

The JobsService has comprehensive unit tests covering all methods:

```bash
cd backend
npm test -- jobs.service.spec.ts
```

**Coverage**: 27 test cases covering:
- Job enqueueing (all job types)
- Queue management (getQueues, getQueue, listJobs)
- Job retrieval (getJob)
- Job actions (retry, remove, fail)
- Error handling and Redis unavailability

### E2E Tests

End-to-end tests verify the complete workflow:

```bash
cd frontend
npm run test:e2e -- job-queues.spec.ts
```

**Test Coverage**:
- Queue overview page loads correctly
- Queue detail navigation works
- Status tabs function properly
- Job actions create audit logs
- RBAC enforcement (admin/ops only)
- Accessibility compliance

### Running Tests with Redis

Use docker-compose for test environment:

```bash
# Start test services
docker-compose -f docker-compose.test.yml up -d redis

# Run backend tests
cd backend
REDIS_URL=redis://localhost:6379 npm test

# Run E2E tests
cd frontend
npm run test:e2e

# Clean up
docker-compose -f docker-compose.test.yml down
```

## Monitoring

### Metrics

The system exposes Prometheus-compatible metrics:

- `queue_jobs_total{queue,status}`: Total jobs by queue and status
- `queue_processing_duration_ms`: Job processing time (histogram)
- `queue_failures_total{queue,reason}`: Failed jobs by reason
- `queue_retries_total{queue}`: Job retry count

**Note**: Full metrics implementation is in progress. Basic metrics are available via queue stats API.

### Health Check

Monitor system health:

```bash
curl http://localhost:4000/health
```

Response includes:
- Database connectivity
- Redis connectivity
- Overall system status (ok/degraded)

## Troubleshooting

### Redis Connection Issues

**Symptom**: Jobs not processing, warning in logs:
```
⚠️  Redis not available - Jobs will be logged but not processed
```

**Solution**:
1. Ensure Redis is running: `docker ps | grep redis`
2. Check `REDIS_URL` in `.env`
3. Test connection: `redis-cli -h localhost -p 6379 ping`
4. Restart backend

### Jobs Stuck in Waiting

**Symptom**: Jobs remain in waiting status indefinitely

**Possible Causes**:
1. Processor not registered for job type
2. Worker not running
3. Job data validation failure

**Solution**:
1. Check backend logs for processor errors
2. Verify processors are registered in `JobsModule`
3. Check job data matches expected schema

### High Failed Job Count

**Symptom**: Many jobs in failed status

**Actions**:
1. Check job details for error messages
2. Review error patterns in audit logs
3. Fix underlying issue (e.g., database constraint, external API down)
4. Bulk retry failed jobs if appropriate

### Permission Denied (403)

**Symptom**: Cannot access `/job-queues` page

**Solution**:
1. Ensure user has `ADMIN` or `OPS` role
2. Check browser console for authentication errors
3. Verify JWT token is valid (not expired)
4. Log out and log back in

## Best Practices

### Job Design

1. **Idempotency**: Design jobs to be safely retried
2. **Small Payloads**: Keep job data minimal
3. **Timeout Handling**: Set appropriate timeouts
4. **Error Logging**: Log detailed error information

### Queue Management

1. **Monitor Failed Jobs**: Review failed jobs daily
2. **Clean Old Jobs**: Remove completed jobs periodically
3. **Retry Strategically**: Don't retry jobs that will fail again
4. **Audit Actions**: Always provide reasons for manual actions

### Performance

1. **Redis Memory**: Monitor Redis memory usage
2. **Queue Depth**: Alert on large waiting queues
3. **Processing Time**: Track job processing duration
4. **Dead Letters**: Investigate dead letter queue regularly

## Development

### Adding a New Job Type

1. **Add job data type** in `jobs.service.ts`
2. **Add enqueue method** in JobsService
3. **Create processor handler** in appropriate processor
4. **Register handler** in processor's `process()` method
5. **Add tests** for new job type
6. **Update documentation**

Example:

```typescript
// 1. Add enqueue method in JobsService
async enqueueNewJobType(data: { field1: string; field2: number }) {
  return this.enqueueOrLog('queue-name', 'job.name', data, {
    jobId: `job-prefix-${data.field1}`,
  });
}

// 2. Add handler in processor
private async handleNewJobType(job: Job) {
  const { field1, field2 } = job.data;
  // Process job...
  return { status: 'success' };
}

// 3. Register in process() method
case 'job.name':
  return await this.handleNewJobType(job);
```

### Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for development guidelines.

## References

- [BullMQ Documentation](https://docs.bullmq.io/)
- [Redis Documentation](https://redis.io/docs/)
- [NestJS BullMQ Module](https://docs.nestjs.com/techniques/queues)
- [Prometheus Metrics](https://prometheus.io/docs/introduction/overview/)

## Support

For issues or questions:
1. Check troubleshooting section above
2. Review backend logs: `docker logs property-manager-api`
3. Check Redis logs: `docker logs property-manager-redis`
4. Create an issue in the GitHub repository
