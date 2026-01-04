import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TenantModule } from './tenant/tenant.module';
import { EmailModule } from './email/email.module';
import { BroadcastModule } from './broadcast/broadcast.module';
import { WebhookModule } from './webhook/webhook.module';
import { SqsModule } from './sqs/sqs.module';
import { CommonModule } from './common/common.module';
import { Tenant } from './tenant/entities/tenant.entity';
import { Domain } from './tenant/entities/domain.entity';
import { EmailLog } from './email/entities/email-log.entity';
import { Broadcast } from './broadcast/entities/broadcast.entity';
import { BroadcastContact } from './broadcast/entities/broadcast-contact.entity';
import { AuditLog } from './common/entities/audit-log.entity';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    TypeOrmModule.forRootAsync({
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get('DATABASE_HOST', 'localhost'),
        port: configService.get('DATABASE_PORT', 5432),
        username: configService.get('DATABASE_USER', 'postgres'),
        password: configService.get('DATABASE_PASSWORD', 'postgres'),
        database: configService.get('DATABASE_NAME', 'email_infrastructure'),
        entities: [Tenant, Domain, EmailLog, Broadcast, BroadcastContact, AuditLog],
        synchronize: configService.get('NODE_ENV') === 'development',
        logging: configService.get('NODE_ENV') === 'development',
        ssl: configService.get('DATABASE_SSL') === 'true' ? {
          rejectUnauthorized: false,
        } : false,
      }),
      inject: [ConfigService],
    }),
    CommonModule,
    TenantModule,
    EmailModule,
    BroadcastModule,
    WebhookModule,
    SqsModule,
  ],
})
export class AppModule {}

