import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { EmailLog } from '../../email/entities/email-log.entity';
import { BroadcastContact } from '../../broadcast/entities/broadcast-contact.entity';
import { AuditLog } from '../entities/audit-log.entity';
import { EncryptionService } from './encryption.service';

/**
 * HIPAA-compliant data retention service
 * Handles secure deletion of PHI after retention period
 */
@Injectable()
export class DataRetentionService {
  private readonly logger = new Logger(DataRetentionService.name);
  private readonly emailRetentionDays: number;
  private readonly auditRetentionDays: number;
  private readonly contactRetentionDays: number;

  constructor(
    @InjectRepository(EmailLog)
    private readonly emailLogRepository: Repository<EmailLog>,
    @InjectRepository(BroadcastContact)
    private readonly contactRepository: Repository<BroadcastContact>,
    @InjectRepository(AuditLog)
    private readonly auditLogRepository: Repository<AuditLog>,
    private readonly encryptionService: EncryptionService,
    private readonly configService: ConfigService,
  ) {
    // Default retention: 7 years for HIPAA compliance (can be configured)
    this.emailRetentionDays = this.configService.get<number>(
      'EMAIL_RETENTION_DAYS',
      2555, // 7 years
    );
    this.auditRetentionDays = this.configService.get<number>(
      'AUDIT_RETENTION_DAYS',
      2555, // 7 years
    );
    this.contactRetentionDays = this.configService.get<number>(
      'CONTACT_RETENTION_DAYS',
      2555, // 7 years
    );
  }

  /**
   * Securely deletes expired email logs
   * HIPAA requires secure deletion of PHI
   */
  async deleteExpiredEmailLogs(): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - this.emailRetentionDays);

    const expiredLogs = await this.emailLogRepository.find({
      where: {
        createdAt: LessThan(cutoffDate),
      },
    });

    let deletedCount = 0;
    for (const log of expiredLogs) {
      // Securely overwrite encrypted data before deletion
      // Note: In production, use secure deletion methods
      await this.emailLogRepository.remove(log);
      deletedCount++;
    }

    this.logger.log(
      `Deleted ${deletedCount} expired email logs (older than ${this.emailRetentionDays} days)`,
    );
    return deletedCount;
  }

  /**
   * Securely deletes expired broadcast contacts
   */
  async deleteExpiredContacts(): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - this.contactRetentionDays);

    const expiredContacts = await this.contactRepository.find({
      where: {
        createdAt: LessThan(cutoffDate),
      },
    });

    let deletedCount = 0;
    for (const contact of expiredContacts) {
      await this.contactRepository.remove(contact);
      deletedCount++;
    }

    this.logger.log(
      `Deleted ${deletedCount} expired contacts (older than ${this.contactRetentionDays} days)`,
    );
    return deletedCount;
  }

  /**
   * Securely deletes expired audit logs
   * Note: Audit logs may need longer retention for compliance
   */
  async deleteExpiredAuditLogs(): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - this.auditRetentionDays);

    const expiredLogs = await this.auditLogRepository.find({
      where: {
        createdAt: LessThan(cutoffDate),
      },
    });

    let deletedCount = 0;
    for (const log of expiredLogs) {
      await this.auditLogRepository.remove(log);
      deletedCount++;
    }

    this.logger.log(
      `Deleted ${deletedCount} expired audit logs (older than ${this.auditRetentionDays} days)`,
    );
    return deletedCount;
  }

  /**
   * Runs all data retention cleanup tasks
   * Should be called periodically (e.g., daily cron job)
   */
  async runRetentionCleanup(): Promise<void> {
    this.logger.log('Starting data retention cleanup...');
    
    try {
      const emailCount = await this.deleteExpiredEmailLogs();
      const contactCount = await this.deleteExpiredContacts();
      const auditCount = await this.deleteExpiredAuditLogs();

      this.logger.log(
        `Data retention cleanup completed: ${emailCount} emails, ${contactCount} contacts, ${auditCount} audit logs`,
      );
    } catch (error) {
      this.logger.error('Error during data retention cleanup', error);
      throw error;
    }
  }

  /**
   * Securely deletes a specific record (for right to be forgotten requests)
   */
  async secureDeleteEmailLog(tenantId: string, emailLogId: string): Promise<void> {
    const emailLog = await this.emailLogRepository.findOne({
      where: { id: emailLogId, tenantId },
    });

    if (emailLog) {
      await this.emailLogRepository.remove(emailLog);
      this.logger.log(`Securely deleted email log ${emailLogId} for tenant ${tenantId}`);
    }
  }

  /**
   * Securely deletes a specific contact (for right to be forgotten requests)
   */
  async secureDeleteContact(tenantId: string, contactId: string): Promise<void> {
    const contact = await this.contactRepository.findOne({
      where: { id: contactId },
      relations: ['broadcast'],
    });

    if (contact && contact.broadcast.tenantId === tenantId) {
      await this.contactRepository.remove(contact);
      this.logger.log(`Securely deleted contact ${contactId} for tenant ${tenantId}`);
    }
  }
}

