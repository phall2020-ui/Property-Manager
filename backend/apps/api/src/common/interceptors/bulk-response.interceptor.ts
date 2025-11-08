import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

interface BulkOperationResponse {
  ok: string[];
  failed: Array<{ id: string; error: string }>;
}

/**
 * Interceptor to handle bulk operation responses
 * Returns 207 Multi-Status if there are any failures
 * Returns 200 OK if all operations succeeded
 */
@Injectable()
export class BulkResponseInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    return next.handle().pipe(
      map((data: unknown) => {
        const response = context.switchToHttp().getResponse();

        // Check if this is a bulk operation response
        if (this.isBulkOperationResponse(data)) {
          // If there are any failures, return 207 Multi-Status
          if (Array.isArray(data.failed) && data.failed.length > 0) {
            response.status(207); // Multi-Status
          } else {
            response.status(200); // OK
          }
        }

        return data;
      }),
    );
  }

  private isBulkOperationResponse(data: unknown): data is BulkOperationResponse {
    return (
      data !== null &&
      typeof data === 'object' &&
      'ok' in data &&
      'failed' in data
    );
  }
}
