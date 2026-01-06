import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import { EmailProcessor } from './sqs/processors/email.processor';
import { BroadcastProcessor } from './sqs/processors/broadcast.processor';
import { HipaaExceptionFilter } from './common/filters/hipaa-exception.filter';
import { AuditInterceptor } from './common/interceptors/audit.interceptor';

async function bootstrap() {
  try {
    const app = await NestFactory.create<NestFastifyApplication>(
      AppModule,
      new FastifyAdapter({ logger: true }),
    );

    const configService = app.get(ConfigService);
    const apiPrefix = configService.get<string>('API_PREFIX', 'api/v1');
    const port = configService.get<number>('PORT', 3000);

    app.setGlobalPrefix(apiPrefix);
    
    // Setup Swagger Documentation
    const config = new DocumentBuilder()
      .setTitle('Email Infrastructure API')
      .setDescription('Production-grade Email Infrastructure API for multi-tenant SaaS')
      .setVersion('1.0.0')
      .addApiKey(
        {
          type: 'apiKey',
          name: 'X-API-Key',
          in: 'header',
          description: 'Tenant API Key for authentication',
        },
        'api-key',
      )
      .addTag('tenant', 'Tenant management endpoints')
      .addTag('email', 'Email sending endpoints')
      .addTag('broadcast', 'Broadcast campaign endpoints')
      .addTag('webhook', 'Webhook endpoints')
      .addTag('health', 'Health check endpoints')
      .build();
    
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup(`${apiPrefix}/docs`, app, document, {
      customSiteTitle: 'Email Infrastructure API Docs',
      customCss: `
        .swagger-ui .topbar { display: none }
        .swagger-ui .scheme-container { display: none }
        .swagger-ui section.models { display: none }
        .swagger-ui .model-container { display: none }
      `,
    });
    
    // Add root route (bypasses global prefix)
    const fastifyInstance = app.getHttpAdapter().getInstance();
    fastifyInstance.get('/', async (request, reply) => {
      return {
        status: 'ok',
        message: 'Email Infrastructure API',
        version: '1.0.0',
        apiPrefix: `/${apiPrefix}`,
        endpoints: {
          tenant: `/${apiPrefix}/tenant`,
          email: `/${apiPrefix}/email`,
          broadcast: `/${apiPrefix}/broadcast`,
          webhook: `/${apiPrefix}/webhook`,
        },
        documentation: `/${apiPrefix}/docs`,
        note: 'All endpoints require X-API-Key header for authentication',
      };
    });
    
    // Add API prefix route handler
    fastifyInstance.get(`/${apiPrefix}`, async (request, reply) => {
      return {
        status: 'ok',
        message: 'Email Infrastructure API',
        version: '1.0.0',
        endpoints: {
          tenant: `/${apiPrefix}/tenant`,
          email: `/${apiPrefix}/email/send`,
          broadcast: `/${apiPrefix}/broadcast/create`,
          webhook: `/${apiPrefix}/webhook/resend`,
        },
        documentation: `/${apiPrefix}/docs`,
        authentication: 'All endpoints require X-API-Key header (except webhooks)',
      };
    });
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    // HIPAA compliance: Use HIPAA exception filter to prevent PHI exposure
    const hipaaExceptionFilter = app.get(HipaaExceptionFilter);
    app.useGlobalFilters(hipaaExceptionFilter);

    // HIPAA compliance: Add audit logging interceptor
    const auditInterceptor = app.get(AuditInterceptor);
    app.useGlobalInterceptors(auditInterceptor);

    await app.listen(port, '0.0.0.0');
    console.log(`Application is running on: http://localhost:${port}/${apiPrefix}`);
    console.log('HIPAA compliance features enabled:');
    console.log('  - PHI encryption at rest');
    console.log('  - Audit logging');
    console.log('  - PHI masking in logs');
    console.log('  - Secure error handling');

    // Start SQS processors
    const emailProcessor = app.get(EmailProcessor);
    const broadcastProcessor = app.get(BroadcastProcessor);
    
    emailProcessor.start().catch((error) => {
      console.error('Failed to start email processor:', error);
    });
    
    broadcastProcessor.start().catch((error) => {
      console.error('Failed to start broadcast processor:', error);
    });
  } catch (error) {
    console.error('❌ Failed to start application:', error);
    if (error.message && error.message.includes('connect')) {
      console.error('\n💡 Database connection error detected!');
      console.error('   Please check:');
      console.error('   1. Is PostgreSQL running?');
      console.error('   2. Do you have a .env file with DATABASE_* variables?');
      console.error('   3. See SUPABASE_SETUP.md for database setup instructions');
    }
    process.exit(1);
  }
}

bootstrap().catch((error) => {
  console.error('Fatal error during bootstrap:', error);
  process.exit(1);
});

