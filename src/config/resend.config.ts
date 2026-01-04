import { registerAs } from '@nestjs/config';

export default registerAs('resend', () => ({
  apiKey: process.env.RESEND_API_KEY || '',
  webhookSecret: process.env.RESEND_WEBHOOK_SECRET || '',
}));

