import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import { EmailProcessor } from './sqs/processors/email.processor';
import { BroadcastProcessor } from './sqs/processors/broadcast.processor';
import { HipaaExceptionFilter } from './common/filters/hipaa-exception.filter';
import { AuditInterceptor } from './common/interceptors/audit.interceptor';

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({ logger: true }),
  );

  const configService = app.get(ConfigService);
  const apiPrefix = configService.get<string>('API_PREFIX', 'api/v1');
  const port = configService.get<number>('PORT', 3000);

  app.setGlobalPrefix(apiPrefix);
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
}

bootstrap();

