import {
  Injectable,
  BadRequestException,
  Logger,
  Inject,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Resend } from 'resend';
import { ConfigService } from '@nestjs/config';
import { EmailLog, EmailStatus } from './entities/email-log.entity';
import { SendEmailDto } from './dto/send-email.dto';
import { TenantService } from '../tenant/tenant.service';
import { SqsService } from '../sqs/sqs.service';
import { EncryptionService } from '../common/services/encryption.service';
import { AuditLogService } from '../common/services/audit-log.service';
import { AuditResource } from '../common/entities/audit-log.entity';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private resend: Resend;

  constructor(
    @InjectRepository(EmailLog)
    private readonly emailLogRepository: Repository<EmailLog>,
    private readonly tenantService: TenantService,
    private readonly sqsService: SqsService,
    private readonly configService: ConfigService,
    private readonly encryptionService: EncryptionService,
    private readonly auditLogService: AuditLogService,
  ) {
    const apiKey = this.configService.get<string>('RESEND_API_KEY');
    this.resend = new Resend(apiKey);
  }

  async sendEmail(
    tenantId: string,
    sendEmailDto: SendEmailDto,
  ): Promise<EmailLog> {
    // Check for idempotency
    if (sendEmailDto.idempotencyKey) {
      const existing = await this.emailLogRepository.findOne({
        where: {
          tenantId,
          idempotencyKey: sendEmailDto.idempotencyKey,
        },
      });

      if (existing) {
        this.logger.log(
          `Idempotent email found: ${existing.id} for key: ${sendEmailDto.idempotencyKey}`,
        );
        return existing;
      }
    }

    // Get tenant and domain
    const tenant = await this.tenantService.findOne(tenantId);
    const domain = sendEmailDto.from
      ? await this.tenantService.findDomainByTenantAndDomain(
          tenantId,
          sendEmailDto.from.split('@')[1],
        )
      : await this.tenantService.getDefaultDomain(tenantId);

    if (!domain) {
      throw new BadRequestException('No active domain found for tenant');
    }

    // Encrypt PHI before saving
    const encryptedTo = this.encryptionService.encrypt(sendEmailDto.to);
    const encryptedFrom = this.encryptionService.encrypt(
      sendEmailDto.from || `noreply@${domain.domain}`
    );
    const encryptedHtml = sendEmailDto.html
      ? this.encryptionService.encrypt(sendEmailDto.html)
      : null;
    const encryptedText = sendEmailDto.text
      ? this.encryptionService.encrypt(sendEmailDto.text)
      : null;

    // Create email log with encrypted PHI
    const emailLog = this.emailLogRepository.create({
      tenantId,
      domainId: domain.id,
      idempotencyKey: sendEmailDto.idempotencyKey || uuidv4(),
      to: encryptedTo,
      from: encryptedFrom,
      subject: sendEmailDto.subject, // Subject may contain PHI, but often doesn't
      html: encryptedHtml,
      text: encryptedText,
      status: EmailStatus.PENDING,
      metadata: sendEmailDto.metadata,
    });

    const savedLog = await this.emailLogRepository.save(emailLog);

    // Log PHI creation for HIPAA compliance
    await this.auditLogService.logPhiCreation(tenantId, AuditResource.EMAIL_LOG, savedLog.id, {
      metadata: { subject: sendEmailDto.subject },
    });

    // Send to SQS for async processing
    await this.sqsService.sendEmailMessage({
      emailLogId: savedLog.id,
      tenantId,
      domainId: domain.id,
      resendApiKey: domain.resendApiKey,
      to: sendEmailDto.to,
      from: sendEmailDto.from || `noreply@${domain.domain}`,
      subject: sendEmailDto.subject,
      html: sendEmailDto.html,
      text: sendEmailDto.text,
    });

    savedLog.status = EmailStatus.QUEUED;
    await this.emailLogRepository.save(savedLog);

    return savedLog;
  }

  async processEmail(message: any): Promise<void> {
    const { emailLogId, resendApiKey, to, from, subject, html, text } = message;

    const emailLog = await this.emailLogRepository.findOne({
      where: { id: emailLogId },
    });

    if (!emailLog) {
      this.logger.error(`Email log not found: ${emailLogId}`);
      return;
    }

    try {
      // Use domain-specific Resend API key
      const resend = new Resend(resendApiKey);

      const result = await resend.emails.send({
        from,
        to,
        subject,
        html,
        text,
      });

      if (result.error) {
        throw new Error(result.error.message);
      }

      emailLog.status = EmailStatus.SENT;
      emailLog.resendEmailId = result.data?.id;
      emailLog.retryCount = message.retryCount || 0;
      await this.emailLogRepository.save(emailLog);

      this.logger.log(`Email sent successfully: ${emailLogId}`);
    } catch (error) {
      // Don't log PHI in error messages
      this.logger.error(`Failed to send email ${emailLogId}`);

      emailLog.status = EmailStatus.FAILED;
      emailLog.error = {
        message: 'Email sending failed', // Sanitized
      };
      emailLog.retryCount = (message.retryCount || 0) + 1;

      await this.emailLogRepository.save(emailLog);

      // Retry logic - send to DLQ after max retries
      if (emailLog.retryCount < 3) {
        await this.sqsService.sendEmailMessage({
          ...message,
          retryCount: emailLog.retryCount,
        });
      } else {
        await this.sqsService.sendToDLQ(message);
        this.logger.warn(`Email ${emailLogId} sent to DLQ after ${emailLog.retryCount} retries`);
      }

      throw error;
    }
  }

  async updateEmailStatus(
    resendEmailId: string,
    status: EmailStatus,
    metadata?: Record<string, any>,
  ): Promise<void> {
    const emailLog = await this.emailLogRepository.findOne({
      where: { resendEmailId },
    });

    if (emailLog) {
      emailLog.status = status;
      if (metadata) {
        emailLog.metadata = { ...emailLog.metadata, ...metadata };
      }
      await this.emailLogRepository.save(emailLog);
    }
  }

  async findOne(tenantId: string, id: string): Promise<EmailLog> {
    const emailLog = await this.emailLogRepository.findOne({
      where: { id, tenantId },
    });

    if (!emailLog) {
      return null;
    }

    // Decrypt PHI before returning
    const decrypted = { ...emailLog };
    try {
      decrypted.to = this.encryptionService.decrypt(emailLog.to);
      decrypted.from = this.encryptionService.decrypt(emailLog.from);
      if (emailLog.html) {
        decrypted.html = this.encryptionService.decrypt(emailLog.html);
      }
      if (emailLog.text) {
        decrypted.text = this.encryptionService.decrypt(emailLog.text);
      }
    } catch (error) {
      this.logger.warn(`Failed to decrypt email log ${id}`);
    }

    // Log PHI access for HIPAA compliance
    await this.auditLogService.logPhiAccess(tenantId, AuditResource.EMAIL_LOG, id, {});

    return decrypted;
  }
}

