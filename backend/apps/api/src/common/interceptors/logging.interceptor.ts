import { CallHandler, ExecutionContext, Injectable, Logger, NestInterceptor } from '@nestjs/common';
import { Observable, tap } from 'rxjs';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, originalUrl } = request;
    const user = request.user;
    const userId = user?.id;
    const now = Date.now();
    return next.handle().pipe(
      tap(() => {
        const latency = Date.now() - now;
        this.logger.log(`${method} ${originalUrl} ${userId ? '[' + userId + ']' : ''} - ${latency}ms`);
      }),
    );
  }
}