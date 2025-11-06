import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';

export interface RequestWithTrace extends Request {
  traceId?: string;
  user?: any; // User from auth guard
}

@Injectable()
export class TraceIdMiddleware implements NestMiddleware {
  private readonly logger = new Logger(TraceIdMiddleware.name);

  use(req: RequestWithTrace, res: Response, next: NextFunction) {
    // Generate or use existing trace ID from header
    const traceId = (req.headers['x-trace-id'] as string) || randomUUID();
    
    // Attach to request
    req.traceId = traceId;
    
    // Add to response headers
    res.setHeader('X-Trace-Id', traceId);
    
    next();
  }
}
