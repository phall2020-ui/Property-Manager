import {
  Controller,
  Post,
  Body,
  Headers,
  RawBodyRequest,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiExcludeEndpoint } from '@nestjs/swagger';
import { Request } from 'express';
import { Public } from '../../common/decorators/public.decorator';
import { WebhookService } from './services/webhook.service';

/**
 * Webhook Controller
 * Handles webhooks from payment providers and bank feed providers
 * These endpoints are public and secured via signature verification
 */
@ApiTags('webhooks')
@Controller('webhooks')
@Public() // Webhooks don't use JWT auth - they use signature verification
export class WebhookController {
  constructor(private readonly webhookService: WebhookService) {}

  /**
   * Handle GoCardless webhooks
   */
  @Post('gocardless')
  @HttpCode(HttpStatus.OK)
  @ApiExcludeEndpoint() // Hide from Swagger docs for security
  async handleGoCardlessWebhook(
    @Headers('webhook-signature') signature: string,
    @Req() req: RawBodyRequest<Request>,
  ) {
    // Get raw body for signature verification
    const rawBody = req.rawBody ? req.rawBody.toString('utf8') : JSON.stringify(req.body);
    
    return this.webhookService.handleGoCardlessWebhook(rawBody, signature);
  }

  /**
   * Handle Stripe webhooks
   */
  @Post('stripe')
  @HttpCode(HttpStatus.OK)
  @ApiExcludeEndpoint() // Hide from Swagger docs for security
  async handleStripeWebhook(
    @Headers('stripe-signature') signature: string,
    @Req() req: RawBodyRequest<Request>,
  ) {
    // Get raw body for signature verification
    const rawBody = req.rawBody ? req.rawBody.toString('utf8') : JSON.stringify(req.body);
    
    return this.webhookService.handleStripeWebhook(rawBody, signature);
  }
}
