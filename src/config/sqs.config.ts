import { registerAs } from '@nestjs/config';

export default registerAs('sqs', () => ({
  region: process.env.AWS_REGION || 'us-east-1',
  emailQueueUrl: process.env.AWS_SQS_EMAIL_QUEUE_URL || '',
  broadcastQueueUrl: process.env.AWS_SQS_BROADCAST_QUEUE_URL || '',
  dlqUrl: process.env.AWS_SQS_DLQ_URL || '',
}));

