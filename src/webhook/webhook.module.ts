import { Module } from '@nestjs/common';
import { WebhookService } from './webhook.service';
import { WebhookController } from './webhook.controller';
import { EmailModule } from '../email/email.module';

@Module({
  imports: [EmailModule],
  controllers: [WebhookController],
  providers: [WebhookService],
})
export class WebhookModule {}

