import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { Request, Response } from 'express';

/**
 * Global exception filter that provides consistent error responses
 * following RFC 7807 Problem Details format with code, message, and details.
 */
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: any, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status = exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
    const message = exception instanceof HttpException ? exception.getResponse() : exception.message;

    // Extract details from validation errors or structured responses
    let details: any = undefined;
    let errorMessage = typeof message === 'string' ? message : 'An error occurred';
    
    if (typeof message === 'object' && message !== null) {
      errorMessage = (message as any).message || errorMessage;
      details = (message as any).details || (message as any).errors;
    }

    // Sanitize error code to avoid exposing internal details
    const sanitizedCode = this.sanitizeErrorCode(exception.code || exception.name || 'ERROR');
    
    const errorResponse = {
      code: sanitizedCode,
      message: errorMessage,
      details: details,
      status,
      type: 'about:blank',
      title: this.sanitizeErrorTitle(exception.name || 'Error'),
      instance: request.url,
      timestamp: new Date().toISOString(),
    };

    // Log errors (but not client errors like 4xx)
    if (status >= 500) {
      this.logger.error(
        `${request.method} ${request.url}`,
        exception.stack,
        'HttpExceptionFilter',
      );
    }

    response.status(status).json(errorResponse);
  }

  /**
   * Sanitize error codes to prevent internal information leakage
   */
  private sanitizeErrorCode(code: string): string {
    // Map internal error codes to generic ones for security
    const allowedCodes = new Set([
      'VALIDATION_ERROR',
      'AUTHENTICATION_ERROR',
      'AUTHORIZATION_ERROR',
      'NOT_FOUND',
      'CONFLICT',
      'BAD_REQUEST',
      'INTERNAL_ERROR',
    ]);

    // Convert common NestJS exception names to standard codes
    const codeMap: Record<string, string> = {
      'UnauthorizedException': 'AUTHENTICATION_ERROR',
      'ForbiddenException': 'AUTHORIZATION_ERROR',
      'NotFoundException': 'NOT_FOUND',
      'ConflictException': 'CONFLICT',
      'BadRequestException': 'BAD_REQUEST',
      'ValidationError': 'VALIDATION_ERROR',
    };

    const mappedCode = codeMap[code] || code;
    return allowedCodes.has(mappedCode) ? mappedCode : 'ERROR';
  }

  /**
   * Sanitize error titles to prevent exposing system internals
   */
  private sanitizeErrorTitle(title: string): string {
    const titleMap: Record<string, string> = {
      'UnauthorizedException': 'Unauthorized',
      'ForbiddenException': 'Forbidden',
      'NotFoundException': 'Not Found',
      'ConflictException': 'Conflict',
      'BadRequestException': 'Bad Request',
    };

    return titleMap[title] || 'Error';
  }
}