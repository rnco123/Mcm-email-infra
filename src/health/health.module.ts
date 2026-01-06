import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HealthController } from './health.controller';
import { DatabaseHealthIndicator } from './indicators/database.health';
import { SqsHealthIndicator } from './indicators/sqs.health';
import { ResendHealthIndicator } from './indicators/resend.health';
import { MemoryHealthIndicator } from './indicators/memory.health';
import { SqsModule } from '../sqs/sqs.module';
import { AuditLog } from '../common/entities/audit-log.entity';

@Module({
  imports: [
    TerminusModule,
    TypeOrmModule.forFeature([AuditLog]),
    SqsModule,
  ],
  controllers: [HealthController],
  providers: [
    DatabaseHealthIndicator,
    SqsHealthIndicator,
    ResendHealthIndicator,
    MemoryHealthIndicator,
  ],
})
export class HealthModule {}

