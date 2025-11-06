import { CallHandler, ExecutionContext, Injectable, Logger, NestInterceptor } from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { RequestWithTrace } from '../middleware/trace-id.middleware';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<RequestWithTrace>();
    const { method, originalUrl, traceId } = request;
    const user = request.user;
    const userId = user?.id;
    const now = Date.now();
    return next.handle().pipe(
      tap(() => {
        const latency = Date.now() - now;
        // Structured JSON logging with traceId
        const logData = {
          method,
          url: originalUrl,
          userId: userId || 'anonymous',
          traceId,
          latency: `${latency}ms`,
          timestamp: new Date().toISOString(),
        };
        this.logger.log(JSON.stringify(logData));
      }),
    );
  }
}