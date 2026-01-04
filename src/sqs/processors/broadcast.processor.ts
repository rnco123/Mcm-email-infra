import { Injectable, Logger } from '@nestjs/common';
import { BroadcastService } from '../../broadcast/broadcast.service';
import { SqsService } from '../sqs.service';

@Injectable()
export class BroadcastProcessor {
  private readonly logger = new Logger(BroadcastProcessor.name);
  private isProcessing = false;

  constructor(
    private readonly broadcastService: BroadcastService,
    private readonly sqsService: SqsService,
  ) {}

  async start(): Promise<void> {
    if (this.isProcessing) {
      return;
    }

    this.isProcessing = true;
    this.logger.log('Broadcast processor started');

    while (this.isProcessing) {
      try {
        const messages = await this.sqsService.receiveMessages(
          this.sqsService.getBroadcastQueueUrl(),
        );

        for (const message of messages) {
          try {
            const body = JSON.parse(message.Body);
            await this.broadcastService.processBroadcast(body);
            await this.sqsService.deleteMessage(
              this.sqsService.getBroadcastQueueUrl(),
              message.ReceiptHandle,
            );
          } catch (error) {
            this.logger.error('Error processing broadcast message:', error);
            // Message will remain in queue and become visible again
          }
        }
      } catch (error) {
        this.logger.error('Error in broadcast processor loop:', error);
        await new Promise((resolve) => setTimeout(resolve, 5000));
      }
    }
  }

  stop(): void {
    this.isProcessing = false;
    this.logger.log('Broadcast processor stopped');
  }
}

