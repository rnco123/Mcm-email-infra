import { Module, Global } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EncryptionService } from './services/encryption.service';
import { PhiMaskingService } from './services/phi-masking.service';
import { AuditLogService } from './services/audit-log.service';
import { DataRetentionService } from './services/data-retention.service';
import { AuditLog } from './entities/audit-log.entity';
import { EmailLog } from '../email/entities/email-log.entity';
import { BroadcastContact } from '../broadcast/entities/broadcast-contact.entity';
import { AuditInterceptor } from './interceptors/audit.interceptor';
import { PhiMaskingInterceptor } from './interceptors/phi-masking.interceptor';
import { HipaaExceptionFilter } from './filters/hipaa-exception.filter';

@Global()
@Module({
  imports: [
    TypeOrmModule.forFeature([AuditLog, EmailLog, BroadcastContact]),
  ],
  providers: [
    EncryptionService,
    PhiMaskingService,
    AuditLogService,
    DataRetentionService,
    AuditInterceptor,
    PhiMaskingInterceptor,
    HipaaExceptionFilter,
  ],
  exports: [
    EncryptionService,
    PhiMaskingService,
    AuditLogService,
    DataRetentionService,
    AuditInterceptor,
    PhiMaskingInterceptor,
    HipaaExceptionFilter,
  ],
})
export class CommonModule {}

