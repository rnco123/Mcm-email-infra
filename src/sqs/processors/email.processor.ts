import { Injectable, Logger } from '@nestjs/common';
import { EmailService } from '../../email/email.service';
import { SqsService } from '../sqs.service';

@Injectable()
export class EmailProcessor {
  private readonly logger = new Logger(EmailProcessor.name);
  private isProcessing = false;

  constructor(
    private readonly emailService: EmailService,
    private readonly sqsService: SqsService,
  ) {}

  async start(): Promise<void> {
    if (this.isProcessing) {
      return;
    }

    this.isProcessing = true;
    this.logger.log('Email processor started');

    while (this.isProcessing) {
      try {
        const messages = await this.sqsService.receiveMessages(
          this.sqsService.getEmailQueueUrl(),
        );

        for (const message of messages) {
          try {
            const body = JSON.parse(message.Body);
            await this.emailService.processEmail(body);
            await this.sqsService.deleteMessage(
              this.sqsService.getEmailQueueUrl(),
              message.ReceiptHandle,
            );
          } catch (error) {
            this.logger.error('Error processing email message:', error);
            // Message will remain in queue and become visible again
          }
        }
      } catch (error) {
        this.logger.error('Error in email processor loop:', error);
        await new Promise((resolve) => setTimeout(resolve, 5000));
      }
    }
  }

  stop(): void {
    this.isProcessing = false;
    this.logger.log('Email processor stopped');
  }
}

