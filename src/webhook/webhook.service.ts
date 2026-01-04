import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac } from 'crypto';
import { ResendWebhookDto } from './dto/resend-webhook.dto';
import { EmailService } from '../email/email.service';
import { EmailStatus } from '../email/entities/email-log.entity';

@Injectable()
export class WebhookService {
  private readonly logger = new Logger(WebhookService.name);
  private readonly webhookSecret: string;

  constructor(
    private readonly emailService: EmailService,
    private readonly configService: ConfigService,
  ) {
    this.webhookSecret = this.configService.get<string>(
      'RESEND_WEBHOOK_SECRET',
      '',
    );
  }

  verifySignature(payload: string, signature: string): boolean {
    if (!this.webhookSecret) {
      this.logger.warn('Webhook secret not configured, skipping verification');
      return true; // Allow in development
    }

    const hmac = createHmac('sha256', this.webhookSecret);
    const digest = hmac.update(payload).digest('hex');
    return digest === signature;
  }

  async handleWebhook(
    payload: ResendWebhookDto,
    signature: string,
  ): Promise<void> {
    // Verify signature
    const payloadString = JSON.stringify(payload);
    if (!this.verifySignature(payloadString, signature)) {
      throw new UnauthorizedException('Invalid webhook signature');
    }

    const { type, data } = payload;

    if (!data?.email_id) {
      this.logger.warn('Webhook missing email_id');
      return;
    }

    switch (type) {
      case 'email.sent':
        await this.emailService.updateEmailStatus(
          data.email_id,
          EmailStatus.SENT,
          { sentAt: data.created_at },
        );
        break;

      case 'email.delivered':
        await this.emailService.updateEmailStatus(
          data.email_id,
          EmailStatus.DELIVERED,
          { deliveredAt: data.created_at },
        );
        break;

      case 'email.bounced':
        await this.emailService.updateEmailStatus(
          data.email_id,
          EmailStatus.BOUNCED,
          { bouncedAt: data.created_at, bounceData: data },
        );
        break;

      case 'email.complained':
        await this.emailService.updateEmailStatus(
          data.email_id,
          EmailStatus.COMPLAINED,
          { complainedAt: data.created_at, complaintData: data },
        );
        break;

      default:
        this.logger.log(`Unhandled webhook type: ${type}`);
    }

    this.logger.log(`Processed webhook: ${type} for email ${data.email_id}`);
  }
}

