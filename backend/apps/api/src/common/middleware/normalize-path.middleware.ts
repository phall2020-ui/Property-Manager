import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

/**
 * Middleware to normalize double slashes in request paths
 * Prevents routes like /api//attachments/sign from breaking
 */
@Injectable()
export class NormalizePathMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    // Normalize multiple consecutive slashes to a single slash
    const originalUrl = req.url;
    const normalizedUrl = originalUrl.replace(/\/+/g, '/');
    
    // If the URL was modified, rewrite the request URL instead of redirecting
    // This avoids open redirect vulnerabilities
    if (originalUrl !== normalizedUrl) {
      // Validate that the normalized URL is still a valid path (not an external URL)
      if (normalizedUrl.startsWith('/')) {
        req.url = normalizedUrl;
      }
    }
    
    next();
  }
}
