import { Injectable, Logger } from '@nestjs/common';
import { Subject, Observable } from 'rxjs';
import { filter } from 'rxjs/operators';

export interface SystemEvent {
  type: string;
  actorRole: string;
  tenantId?: string;
  landlordId?: string;
  resources: Array<{ type: string; id: string }>;
  version: number;
  at: string;
  payload?: any;
}

interface EventSubscription {
  userId: string;
  landlordId?: string;
  tenantId?: string;
  role: string;
}

@Injectable()
export class EventsService {
  private readonly logger = new Logger(EventsService.name);
  private readonly eventSubject = new Subject<SystemEvent>();
  private version = 0;

  /**
   * Emit an event to all subscribers
   */
  emit(event: Omit<SystemEvent, 'version' | 'at'>): void {
    this.version++;
    const fullEvent: SystemEvent = {
      ...event,
      version: this.version,
      at: new Date().toISOString(),
    };

    this.logger.log(`Emitting event: ${event.type} for landlord=${event.landlordId}, tenant=${event.tenantId}`);
    this.eventSubject.next(fullEvent);
  }

  /**
   * Subscribe to events based on user context
   */
  subscribe(subscription: EventSubscription): Observable<SystemEvent> {
    return this.eventSubject.asObservable().pipe(
      filter((event) => {
        // OPS role sees everything
        if (subscription.role === 'OPS') {
          return true;
        }

        // LANDLORD sees events for their landlordId
        if (subscription.role === 'LANDLORD' && subscription.landlordId) {
          return event.landlordId === subscription.landlordId;
        }

        // TENANT sees events for their tenantId
        if (subscription.role === 'TENANT' && subscription.tenantId) {
          return event.tenantId === subscription.tenantId;
        }

        // CONTRACTOR sees events they're involved in (could be extended)
        if (subscription.role === 'CONTRACTOR') {
          // For now, contractors don't get SSE updates
          return false;
        }

        return false;
      })
    );
  }

  /**
   * Get the current event version
   */
  getCurrentVersion(): number {
    return this.version;
  }
}
