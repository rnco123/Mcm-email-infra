import {
  Controller,
  Post,
  Body,
  Headers,
  RawBodyRequest,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import { FastifyRequest } from 'fastify';
import { WebhookService } from './webhook.service';
import { ResendWebhookDto } from './dto/resend-webhook.dto';

@Controller('webhook')
export class WebhookController {
  constructor(private readonly webhookService: WebhookService) {}

  @Post('resend')
  async handleResendWebhook(
    @Req() req: RawBodyRequest<FastifyRequest>,
    @Body() payload: ResendWebhookDto,
    @Headers('resend-signature') signature: string,
  ) {
    if (!signature) {
      throw new UnauthorizedException('Missing webhook signature');
    }

    await this.webhookService.handleWebhook(payload, signature);
    return { received: true };
  }
}

