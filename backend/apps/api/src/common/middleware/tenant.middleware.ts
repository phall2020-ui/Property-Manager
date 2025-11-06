import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { TenantContext } from '../context/tenant.context';

/**
 * Middleware to extract tenant context from JWT token and set it in AsyncLocalStorage.
 * This makes the tenant ID available throughout the request lifecycle for automatic
 * tenant scoping in Prisma queries.
 */
@Injectable()
export class TenantMiddleware implements NestMiddleware {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  use(req: Request, res: Response, next: NextFunction) {
    const token = this.extractTokenFromHeader(req);
    let tenantId: string | null = null;
    let userId: string | undefined;

    if (token) {
      try {
        const payload = this.jwtService.verify(token, {
          secret: this.configService.get<string>('app.jwt.accessSecret'),
        });
        
        // Extract landlordId as tenantId and userId from JWT payload
        tenantId = payload.landlordId || null;
        userId = payload.sub;
      } catch (error) {
        // Token verification failed, continue without tenant context
        // The auth guard will handle authentication failures
        // Log for security monitoring (without exposing token)
        if (process.env.NODE_ENV !== 'test') {
          console.warn('TenantMiddleware: Failed to verify token', {
            path: req.path,
            method: req.method,
            // Don't log the actual token or error details
          });
        }
      }
    }

    // Run the request with tenant context
    TenantContext.run(tenantId, userId, () => {
      next();
    });
  }

  private extractTokenFromHeader(request: Request): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}
