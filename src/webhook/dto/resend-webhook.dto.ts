export class ResendWebhookDto {
  type: string;
  created_at: string;
  data: {
    email_id: string;
    from: string;
    to: string[];
    created_at: string;
    subject?: string;
    [key: string]: any;
  };
}

