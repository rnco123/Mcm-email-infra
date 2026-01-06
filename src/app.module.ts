import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TenantModule } from './tenant/tenant.module';
import { EmailModule } from './email/email.module';
import { BroadcastModule } from './broadcast/broadcast.module';
import { WebhookModule } from './webhook/webhook.module';
import { SqsModule } from './sqs/sqs.module';
import { CommonModule } from './common/common.module';
import { HealthModule } from './health/health.module';
import { Tenant } from './tenant/entities/tenant.entity';
import { Domain } from './tenant/entities/domain.entity';
import { EmailLog } from './email/entities/email-log.entity';
import { Broadcast } from './broadcast/entities/broadcast.entity';
import { BroadcastContact } from './broadcast/entities/broadcast-contact.entity';
import { AuditLog } from './common/entities/audit-log.entity';
import * as dns from 'dns';
import { promisify } from 'util';

const lookup = promisify(dns.lookup);

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    TypeOrmModule.forRootAsync({
      useFactory: async (configService: ConfigService) => {
        const originalHost = configService.get('DATABASE_HOST', 'localhost');
        
        // Resolve hostname to IPv4 address to force IPv4 connection (fixes Railway IPv6 ENETUNREACH error)
        let dbHost = originalHost;
        try {
          // Only resolve if it's not already an IP address
          if (!/^\d+\.\d+\.\d+\.\d+$/.test(originalHost)) {
            const result = await lookup(originalHost, { family: 4 });
            dbHost = result.address;
            console.log(`✅ Resolved ${originalHost} to IPv4: ${dbHost}`);
          } else {
            console.log(`ℹ️  Using IP address directly: ${dbHost}`);
          }
        } catch (error) {
          console.warn(`⚠️  Failed to resolve ${originalHost} to IPv4, using original hostname:`, error.message);
          // Fallback to original hostname
        }

        const dbConfig = {
          type: 'postgres' as const,
          host: dbHost,
          port: parseInt(configService.get('DATABASE_PORT', '5432'), 10),
          username: configService.get('DATABASE_USER', 'postgres'),
          password: configService.get('DATABASE_PASSWORD', 'postgres'),
          database: configService.get('DATABASE_NAME', 'email_infrastructure'),
          entities: [Tenant, Domain, EmailLog, Broadcast, BroadcastContact, AuditLog],
          synchronize: configService.get('NODE_ENV') === 'development',
          logging: false, // Disable verbose query logging
          ssl: configService.get('DATABASE_SSL') === 'true' ? {
            rejectUnauthorized: false,
            require: true,
          } : false,
          extra: {
            max: 10,
            connectionTimeoutMillis: 10000, // 10 second timeout (matches working test)
            idleTimeoutMillis: 30000,
            keepAlive: true,
            keepAliveInitialDelayMillis: 0,
          },
          // Remove retry attempts to fail faster and see errors immediately
          retryAttempts: 0,
        };

        const isSupabasePooler = dbConfig.port === 6543;
        console.log('Attempting to connect to database:', {
          host: dbConfig.host,
          originalHost: originalHost !== dbHost ? originalHost : undefined,
          port: dbConfig.port,
          database: dbConfig.database,
          username: dbConfig.username,
          ssl: dbConfig.ssl ? 'enabled' : 'disabled',
          pooler: isSupabasePooler ? 'Supabase Connection Pooler' : 'Direct Connection',
        });
        
        if (isSupabasePooler) {
          console.log('ℹ️  Using Supabase Connection Pooler (port 6543)');
          console.log('   If connection fails, try direct connection (port 5432)');
        }
        
        console.log('⚠️  If this hangs, check:');
        console.log('   1. Network connectivity to ' + dbConfig.host);
        console.log('   2. Firewall allows connection on port ' + dbConfig.port);
        console.log('   3. Database credentials are correct');
        console.log('   4. For Supabase: Try port 5432 (direct) instead of 6543 (pooler)');

        return dbConfig;
      },
      inject: [ConfigService],
    }),
    CommonModule,
    TenantModule,
    EmailModule,
    BroadcastModule,
    WebhookModule,
    SqsModule,
    HealthModule,
  ],
})
export class AppModule {}

