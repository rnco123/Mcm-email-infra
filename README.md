# Email Infrastructure API

Production-grade Email Infrastructure API for multi-tenant SaaS built with NestJS, Fastify, Resend, AWS SQS, and PostgreSQL.

## Architecture Overview

This API provides a scalable, production-ready email infrastructure with the following key features:

### Core Components

1. **Multi-Tenant System**: Tenant → Domain → API Key mapping for complete isolation
2. **Transactional Emails**: Idempotent email sending with retry logic
3. **Broadcast Campaigns**: Server-side contact expansion for large-scale campaigns
4. **Webhook Processing**: Resend webhook handling with signature verification
5. **Async Processing**: AWS SQS for reliable queue-based email processing
6. **Dead Letter Queue**: Failed messages after max retries

## Project Structure

```
email-infrastructure-api/
├── src/
│   ├── main.ts                    # Application entry point (Fastify)
│   ├── app.module.ts              # Root module
│   │
│   ├── config/                    # Configuration modules
│   │   ├── database.config.ts
│   │   ├── sqs.config.ts
│   │   └── resend.config.ts
│   │
│   ├── common/                    # Shared utilities
│   │   ├── decorators/
│   │   │   └── tenant.decorator.ts
│   │   ├── interceptors/
│   │   │   └── tenant.interceptor.ts
│   │   └── filters/
│   │       └── http-exception.filter.ts
│   │
│   ├── tenant/                    # Tenant Management Module
│   │   ├── entities/
│   │   │   ├── tenant.entity.ts
│   │   │   └── domain.entity.ts
│   │   ├── dto/
│   │   │   ├── create-tenant.dto.ts
│   │   │   └── create-domain.dto.ts
│   │   ├── tenant.service.ts
│   │   ├── tenant.controller.ts
│   │   └── tenant.module.ts
│   │
│   ├── email/                     # Email Sending Module
│   │   ├── entities/
│   │   │   └── email-log.entity.ts
│   │   ├── dto/
│   │   │   └── send-email.dto.ts
│   │   ├── email.service.ts
│   │   ├── email.controller.ts
│   │   └── email.module.ts
│   │
│   ├── broadcast/                 # Broadcast Campaigns Module
│   │   ├── entities/
│   │   │   ├── broadcast.entity.ts
│   │   │   └── broadcast-contact.entity.ts
│   │   ├── dto/
│   │   │   ├── create-broadcast.dto.ts
│   │   │   └── add-contacts.dto.ts
│   │   ├── broadcast.service.ts
│   │   ├── broadcast.controller.ts
│   │   └── broadcast.module.ts
│   │
│   ├── webhook/                   # Resend Webhook Handler
│   │   ├── dto/
│   │   │   └── resend-webhook.dto.ts
│   │   ├── webhook.service.ts
│   │   ├── webhook.controller.ts
│   │   └── webhook.module.ts
│   │
│   └── sqs/                       # AWS SQS Integration
│       ├── sqs.service.ts
│       ├── processors/
│       │   ├── email.processor.ts
│       │   └── broadcast.processor.ts
│       └── sqs.module.ts
│
├── package.json
├── tsconfig.json
├── nest-cli.json
└── .env.example
```

## Setup Instructions

1. **Install Dependencies**:
```bash
npm install
```

2. **Configure Environment**:
Copy `.env.example` to `.env` and fill in:
- Database credentials
- AWS SQS queue URLs
- Resend API key
- Webhook secret

3. **Database Setup**:
The application uses TypeORM with `synchronize: true` in development. For production, use migrations.

4. **Start Application**:
```bash
npm run start:dev
```

## API Authentication

All endpoints (except webhooks) require authentication via API key:

**Header**: `X-API-Key: <tenant-api-key>`

The `TenantInterceptor` automatically validates the API key and injects `tenantId` into the request.

## Production Considerations

1. **Database Migrations**: Replace `synchronize: true` with proper migrations
2. **Encryption**: Encrypt `resendApiKey` in Domain entity (use AWS KMS or similar)
3. **AWS Credentials**: Configure via IAM roles or environment variables
4. **Queue Processors**: Run processors as separate services/workers
5. **Monitoring**: Add logging, metrics, and alerting
6. **Rate Limiting**: Implement rate limiting per tenant
7. **Webhook Security**: Always verify webhook signatures in production

## Tech Stack

- **Runtime**: Node.js 20
- **Framework**: NestJS 10 with Fastify
- **Email Provider**: Resend
- **Queue**: AWS SQS
- **Database**: PostgreSQL with TypeORM
- **Validation**: class-validator, class-transformer

## License

MIT

