import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  SQSClient,
  SendMessageCommand,
  ReceiveMessageCommand,
  DeleteMessageCommand,
  GetQueueAttributesCommand,
} from '@aws-sdk/client-sqs';

@Injectable()
export class SqsService {
  private readonly logger = new Logger(SqsService.name);
  private readonly sqsClient: SQSClient;
  private readonly emailQueueUrl: string;
  private readonly broadcastQueueUrl: string;
  private readonly dlqUrl: string;

  constructor(private readonly configService: ConfigService) {
    const region = this.configService.get<string>('AWS_REGION', 'us-east-1');
    this.sqsClient = new SQSClient({ region });
    this.emailQueueUrl = this.configService.get<string>(
      'AWS_SQS_EMAIL_QUEUE_URL',
      '',
    );
    this.broadcastQueueUrl = this.configService.get<string>(
      'AWS_SQS_BROADCAST_QUEUE_URL',
      '',
    );
    this.dlqUrl = this.configService.get<string>('AWS_SQS_DLQ_URL', '');
  }

  async sendEmailMessage(message: any): Promise<void> {
    try {
      const command = new SendMessageCommand({
        QueueUrl: this.emailQueueUrl,
        MessageBody: JSON.stringify(message),
        MessageAttributes: {
          MessageType: {
            DataType: 'String',
            StringValue: 'email',
          },
        },
      });

      await this.sqsClient.send(command);
      this.logger.log(`Email message sent to queue: ${message.emailLogId}`);
    } catch (error) {
      this.logger.error('Failed to send email message to SQS:', error);
      throw error;
    }
  }

  async sendBroadcastMessage(message: any): Promise<void> {
    try {
      const command = new SendMessageCommand({
        QueueUrl: this.broadcastQueueUrl,
        MessageBody: JSON.stringify(message),
        MessageAttributes: {
          MessageType: {
            DataType: 'String',
            StringValue: 'broadcast',
          },
        },
      });

      await this.sqsClient.send(command);
      this.logger.log(`Broadcast message sent to queue: ${message.broadcastId}`);
    } catch (error) {
      this.logger.error('Failed to send broadcast message to SQS:', error);
      throw error;
    }
  }

  async sendToDLQ(message: any): Promise<void> {
    try {
      const command = new SendMessageCommand({
        QueueUrl: this.dlqUrl,
        MessageBody: JSON.stringify({
          ...message,
          dlqTimestamp: new Date().toISOString(),
          reason: 'Max retries exceeded',
        }),
      });

      await this.sqsClient.send(command);
      this.logger.warn(`Message sent to DLQ: ${JSON.stringify(message)}`);
    } catch (error) {
      this.logger.error('Failed to send message to DLQ:', error);
      throw error;
    }
  }

  async receiveMessages(
    queueUrl: string,
    maxMessages: number = 10,
  ): Promise<any[]> {
    try {
      const command = new ReceiveMessageCommand({
        QueueUrl: queueUrl,
        MaxNumberOfMessages: maxMessages,
        WaitTimeSeconds: 20, // Long polling
        MessageAttributeNames: ['All'],
      });

      const response = await this.sqsClient.send(command);
      return response.Messages || [];
    } catch (error) {
      this.logger.error('Failed to receive messages from SQS:', error);
      throw error;
    }
  }

  async deleteMessage(queueUrl: string, receiptHandle: string): Promise<void> {
    try {
      const command = new DeleteMessageCommand({
        QueueUrl: queueUrl,
        ReceiptHandle: receiptHandle,
      });

      await this.sqsClient.send(command);
    } catch (error) {
      this.logger.error('Failed to delete message from SQS:', error);
      throw error;
    }
  }

  getEmailQueueUrl(): string {
    return this.emailQueueUrl;
  }

  getBroadcastQueueUrl(): string {
    return this.broadcastQueueUrl;
  }
}

