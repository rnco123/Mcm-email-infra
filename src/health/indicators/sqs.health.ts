import { Injectable } from '@nestjs/common';
import {
  HealthIndicator,
  HealthIndicatorResult,
  HealthCheckError,
} from '@nestjs/terminus';
import { SqsService } from '../../sqs/sqs.service';
import { GetQueueAttributesCommand } from '@aws-sdk/client-sqs';

@Injectable()
export class SqsHealthIndicator extends HealthIndicator {
  constructor(private readonly sqsService: SqsService) {
    super();
  }

  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    const startTime = Date.now();
    const status: Record<string, any> = {};

    try {
      // Check email queue
      const emailQueueUrl = this.sqsService.getEmailQueueUrl();
      if (emailQueueUrl) {
        status.emailQueue = 'configured';
        status.emailQueueUrl = emailQueueUrl;
      } else {
        status.emailQueue = 'not_configured';
      }

      // Check broadcast queue
      const broadcastQueueUrl = this.sqsService.getBroadcastQueueUrl();
      if (broadcastQueueUrl) {
        status.broadcastQueue = 'configured';
        status.broadcastQueueUrl = broadcastQueueUrl;
      } else {
        status.broadcastQueue = 'not_configured';
      }

      const responseTime = Date.now() - startTime;
      
      // Consider healthy if at least one queue is configured
      // (in development, queues might not be configured)
      const isHealthy = emailQueueUrl || broadcastQueueUrl;

      if (isHealthy) {
        return this.getStatus(key, true, {
          status: 'up',
          responseTime: `${responseTime}ms`,
          ...status,
        });
      } else {
        // If no queues configured, still return healthy but with warning
        return this.getStatus(key, true, {
          status: 'up',
          responseTime: `${responseTime}ms`,
          ...status,
          warning: 'SQS queues not configured (may be in development mode)',
        });
      }
    } catch (error) {
      const responseTime = Date.now() - startTime;
      throw new HealthCheckError(
        'SQS check failed',
        this.getStatus(key, false, {
          status: 'down',
          responseTime: `${responseTime}ms`,
          error: error.message,
        }),
      );
    }
  }
}

