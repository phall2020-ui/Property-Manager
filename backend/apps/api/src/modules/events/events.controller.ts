import { Controller, Get, Sse, MessageEvent } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Observable, interval } from 'rxjs';
import { map, switchMap, startWith } from 'rxjs/operators';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { EventsService, SystemEvent } from './events.service';

@ApiTags('events')
@Controller('events')
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @Sse()
  @Get()
  @ApiOperation({ summary: 'Subscribe to server-sent events' })
  @ApiBearerAuth()
  streamEvents(@CurrentUser() user: any): Observable<MessageEvent> {
    // Extract user context
    const userId = user.sub;
    const primaryOrg = user.orgs?.[0];
    const role = primaryOrg?.role || user.role || 'TENANT';
    
    // Get landlordId or tenantId based on role
    let landlordId: string | undefined;
    let tenantId: string | undefined;

    if (role === 'LANDLORD') {
      landlordId = primaryOrg?.orgId;
    } else if (role === 'TENANT') {
      tenantId = primaryOrg?.orgId;
    }

    // Subscribe to events
    const events$ = this.eventsService.subscribe({
      userId,
      landlordId,
      tenantId,
      role,
    });

    // Send keepalive every 30 seconds to prevent connection timeout
    const keepalive$ = interval(30000).pipe(
      map(() => ({
        type: 'keepalive',
        data: { timestamp: new Date().toISOString() },
      }))
    );

    // Merge events with keepalive
    return events$.pipe(
      startWith({ type: 'connected', data: { message: 'Connected to event stream' } }),
      map((event: SystemEvent | any) => {
        if (event.type === 'connected' || event.type === 'keepalive') {
          return event;
        }
        
        return {
          type: event.type,
          data: event,
        };
      })
    );
  }
}
