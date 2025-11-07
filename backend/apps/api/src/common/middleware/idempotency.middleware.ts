import { Injectable, NestMiddleware, Logger, ConflictException } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { PrismaService } from '../prisma/prisma.service';
import * as crypto from 'crypto';

/**
 * Idempotency Middleware
 * Prevents duplicate processing of critical API requests using idempotency keys
 */
@Injectable()
export class IdempotencyMiddleware implements NestMiddleware {
  private readonly logger = new Logger(IdempotencyMiddleware.name);

  constructor(private prisma: PrismaService) {}

  async use(req: Request, res: Response, next: NextFunction) {
    // Only apply to POST, PUT, PATCH, DELETE requests
    if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
      return next();
    }

    // Get idempotency key from header
    const idempotencyKey = req.headers['idempotency-key'] as string;

    if (!idempotencyKey) {
      // Idempotency key is optional, continue without it
      return next();
    }

    try {
      // Validate idempotency key format (UUID or similar)
      if (!this.isValidIdempotencyKey(idempotencyKey)) {
        return res.status(400).json({
          statusCode: 400,
          message: 'Invalid idempotency key format',
          error: 'Bad Request',
        });
      }

      // Calculate hash of request body for integrity check
      const bodyHash = this.hashRequestBody(req.body);

      // Check if this key was used before
      const existingKey = await this.prisma.idempotencyKey.findUnique({
        where: { key: idempotencyKey },
      });

      if (existingKey) {
        // Key exists - check if it's the same request
        if (existingKey.hash !== bodyHash) {
          // Same key, different request body - this is an error
          this.logger.warn(`Idempotency key reused with different request body: ${idempotencyKey}`);
          return res.status(409).json({
            statusCode: 409,
            message: 'Idempotency key already used with different request',
            error: 'Conflict',
          });
        }

        // Same request - return cached response if available
        if (existingKey.response) {
          this.logger.log(`Returning cached response for idempotency key: ${idempotencyKey}`);
          const cachedResponse = JSON.parse(existingKey.response);
          return res.status(cachedResponse.statusCode || 200).json(cachedResponse.body);
        }

        // Request is still processing - tell client to retry later
        this.logger.log(`Request still processing for idempotency key: ${idempotencyKey}`);
        return res.status(409).json({
          statusCode: 409,
          message: 'Request is still being processed',
          error: 'Conflict',
        });
      }

      // New idempotency key - store it
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 24); // Keys expire after 24 hours

      await this.prisma.idempotencyKey.create({
        data: {
          key: idempotencyKey,
          hash: bodyHash,
          expiresAt,
        },
      });

      // Intercept response to cache it
      const originalJson = res.json.bind(res);
      res.json = (body: any) => {
        // Cache the response
        this.cacheResponse(idempotencyKey, res.statusCode, body).catch(err => {
          this.logger.error(`Error caching response: ${err.message}`);
        });

        return originalJson(body);
      };

      next();
    } catch (error) {
      this.logger.error(`Error in idempotency middleware: ${error.message}`, error.stack);
      next(error);
    }
  }

  /**
   * Validate idempotency key format
   */
  private isValidIdempotencyKey(key: string): boolean {
    // Accept UUID format or any alphanumeric string 16-64 chars
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const alphanumericRegex = /^[a-zA-Z0-9_-]{16,64}$/;
    
    return uuidRegex.test(key) || alphanumericRegex.test(key);
  }

  /**
   * Hash request body for integrity check
   */
  private hashRequestBody(body: any): string {
    const bodyString = JSON.stringify(body || {});
    return crypto.createHash('sha256').update(bodyString).digest('hex');
  }

  /**
   * Cache response for idempotency key
   */
  private async cacheResponse(
    key: string,
    statusCode: number,
    body: any,
  ): Promise<void> {
    try {
      const response = JSON.stringify({
        statusCode,
        body,
      });

      await this.prisma.idempotencyKey.update({
        where: { key },
        data: { response },
      });

      this.logger.log(`Cached response for idempotency key: ${key}`);
    } catch (error) {
      this.logger.error(`Error caching response: ${error.message}`);
    }
  }
}
