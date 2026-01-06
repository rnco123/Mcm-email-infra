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
import { ApiTags, ApiOperation, ApiResponse, ApiHeader } from '@nestjs/swagger';
import { WebhookService } from './webhook.service';
import { ResendWebhookDto } from './dto/resend-webhook.dto';

@ApiTags('webhook')
@Controller('webhook')
export class WebhookController {
  constructor(private readonly webhookService: WebhookService) {}

  @Post('resend')
  @ApiOperation({ summary: 'Handle Resend webhook events' })
  @ApiHeader({
    name: 'resend-signature',
    description: 'Resend webhook signature for verification',
    required: true,
  })
  @ApiResponse({
    status: 200,
    description: 'Webhook received and processed successfully',
    schema: {
      type: 'object',
      properties: {
        received: { type: 'boolean', example: true },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Missing or invalid webhook signature' })
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

